import { API_BASE_URL } from './config';

/**
 * HTTP client for the Noctyvera API.
 *
 * Handles the three things every call needs:
 *   · bearer token from the token store
 *   · one automatic retry through /auth/refresh on a 401
 *   · ErrorResponse -> ApiError, so the UI shows the server's message
 *
 * In dev, API_BASE_URL points at the Vite proxy (`/api/v1`), which
 * forwards to the tunnel and adds the ngrok bypass header. That keeps
 * the browser same-origin, so there is no CORS negotiation at all.
 */

const ACCESS_KEY = 'nightgals.access';
const REFRESH_KEY = 'nightgals.refresh';

export class ApiError extends Error {
  constructor(message, code, status, fieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors ?? null;
  }
}

/* ── Token store ───────────────────────────────────────────────── */

export const tokens = {
  get access() {
    try {
      return localStorage.getItem(ACCESS_KEY);
    } catch {
      return null;
    }
  },
  get refresh() {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set({ accessToken, refreshToken }) {
    try {
      if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    } catch {
      /* storage disabled — session lasts for this page only */
    }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

/* ── Refresh ───────────────────────────────────────────────────── */

let refreshInFlight = null;
const listeners = new Set();

/** Notified when the session dies, so the app can bounce to /login. */
export function onAuthExpired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function sessionExpired() {
  tokens.clear();
  listeners.forEach((fn) => fn());
}

async function refreshAccessToken() {
  const refreshToken = tokens.refresh;
  if (!refreshToken) {
    sessionExpired();
    throw new ApiError('Your session has expired. Please sign in again.', 'session_expired', 401);
  }

  // Collapse parallel 401s into a single refresh call.
  refreshInFlight ??= (async () => {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      sessionExpired();
      throw new ApiError('Your session has expired. Please sign in again.', 'session_expired', 401);
    }
    const auth = await res.json();
    tokens.set(auth);
    return auth.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/* ── Core request ──────────────────────────────────────────────── */

async function parse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toError(body, res) {
  if (body && typeof body === 'object') {
    return new ApiError(
      body.message || res.statusText || 'Something went wrong.',
      body.code,
      res.status,
      body.fieldErrors,
    );
  }
  return new ApiError(typeof body === 'string' && body ? body : res.statusText, undefined, res.status);
}

async function send(path, { method = 'GET', body, headers = {}, auth = true, raw = false } = {}, retried = false) {
  const isForm = body instanceof FormData;
  const token = auth ? tokens.access : null;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isForm || body == null ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body == null ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && auth && !retried && tokens.refresh) {
    await refreshAccessToken();
    return send(path, { method, body, headers, auth, raw }, true);
  }

  if (!res.ok) {
    if (res.status === 401 && auth) sessionExpired();
    const err = toError(await parse(res), res);
    // The server signals "account exists but isn't verified yet" this way.
    if (res.status === 403 && err.code === 'verification_required') {
      err.needsVerification = true;
    }
    throw err;
  }

  if (raw) return res;
  return parse(res);
}

export const http = {
  get: (path, opts) => send(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => send(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => send(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => send(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => send(path, { ...opts, method: 'DELETE' }),

  /**
   * Multipart upload — used by media and KYC document endpoints.
   * Only the file goes in the body; anything else belongs on the query
   * string, which is what these endpoints expect.
   */
  upload: (path, file) => {
    const form = new FormData();
    form.append('file', file);
    return send(path, { method: 'POST', body: form });
  },

  /**
   * Fetch a binary endpoint as a blob.
   *
   * Every route on this API sits behind bearerAuth, and the browser does NOT
   * attach the Authorization header to <img src> / <video src> requests — so
   * file endpoints have to be fetched here and handed to the element as an
   * object URL. Goes through send(), so it inherits the 401-refresh retry.
   */
  blob: async (path) => {
    const res = await send(path, { method: 'GET', raw: true });
    return res.blob();
  },

  /** Raw URL — only usable where the request will carry credentials. */
  fileUrl: (path) => `${API_BASE_URL}${path}`,
};

/** Spring pageable query string. */
export const pageQuery = ({ page = 0, size = 24, sort } = {}) => {
  const p = new URLSearchParams();
  p.set('page', String(page));
  p.set('size', String(size));
  if (sort) [].concat(sort).forEach((s) => p.append('sort', s));
  return p;
};
