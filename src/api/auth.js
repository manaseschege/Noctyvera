import { NEXT_STEP, VERIFICATION } from './config';
import { http, tokens } from './http';

/**
 * The last AuthResponse, kept so the app can still work when GET /me is
 * unavailable. login/register return the same identity fields, so we can
 * reconstruct the session from them.
 *
 * BACKEND BUG (2026-07-29): GET /me returns 500 for any account that has
 * a profile — reproducible, and it survives a fresh login. Remove this
 * fallback once /me is fixed.
 */
const IDENTITY_KEY = 'nightgals.identity';

const cacheIdentity = (auth) => {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(auth));
  } catch {
    /* storage unavailable — fallback just won't survive a reload */
  }
};

const readIdentity = () => {
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? 'null');
  } catch {
    return null;
  }
};

/** Derive the onboarding step the server would have reported. */
function deriveNextStep({ profileComplete, verificationStatus }) {
  if (!profileComplete) return NEXT_STEP.CREATE_PROFILE;
  switch (verificationStatus) {
    case VERIFICATION.APPROVED:
      return NEXT_STEP.DONE;
    case VERIFICATION.PENDING_REVIEW:
      return NEXT_STEP.AWAIT_REVIEW;
    case VERIFICATION.REJECTED:
      return NEXT_STEP.RESUBMIT_KYC;
    default:
      return NEXT_STEP.SUBMIT_KYC;
  }
}

/** Best-effort MeResponse built from the cached AuthResponse + /me/profile. */
async function reconstructMe() {
  const id = readIdentity();
  if (!id) return null;

  let profileComplete = id.profileComplete ?? false;
  let verificationStatus = id.verificationStatus ?? VERIFICATION.UNVERIFIED;
  let username = id.username;

  // /me/profile still works, and it carries the live verification status.
  try {
    const p = await http.get('/me/profile');
    if (p) {
      profileComplete = true;
      verificationStatus = p.verificationStatus ?? verificationStatus;
      username = p.username ?? username;
    }
  } catch {
    /* 404 simply means no profile yet */
  }

  return {
    id: id.userId,
    email: id.email ?? null,
    username,
    role: id.role,
    status: 'ACTIVE',
    verificationStatus,
    profileComplete,
    canPostMedia: verificationStatus === VERIFICATION.APPROVED,
    nextStep: deriveNextStep({ profileComplete, verificationStatus }),
    degraded: true, // the UI can note that /me was unavailable
  };
}

/**
 * Auth + identity.
 *
 *   POST /auth/register  -> AuthResponse (username is server-generated)
 *   POST /auth/login     -> AuthResponse
 *   POST /auth/refresh   -> AuthResponse   (handled inside http.js)
 *   POST /auth/logout    -> revokes this refresh token
 *   GET  /me             -> MeResponse
 */

export async function register({ email, password }) {
  const auth = await http.post('/auth/register', { email, password }, { auth: false });
  tokens.set(auth);
  cacheIdentity({ ...auth, email });
  return auth;
}

export async function login({ email, password }) {
  const auth = await http.post('/auth/login', { email, password }, { auth: false });
  tokens.set(auth);
  cacheIdentity({ ...auth, email });
  return auth;
}

export async function logout() {
  const refreshToken = tokens.refresh;
  try {
    if (refreshToken) await http.post('/auth/logout', { refreshToken });
  } catch {
    /* already invalid server-side — clearing locally is enough */
  }
  tokens.clear();
  try {
    localStorage.removeItem(IDENTITY_KEY);
  } catch {
    /* nothing to clear */
  }
}

export async function logoutEverywhere() {
  try {
    await http.post('/auth/logout-all');
  } finally {
    tokens.clear();
  }
}

/** Current user, or null when there is no usable session. */
export async function me() {
  if (!tokens.access && !tokens.refresh) return null;
  try {
    return await http.get('/me');
  } catch (e) {
    if (e.status === 401) return null;
    // /me is currently 500ing for accounts that have a profile. Rebuild the
    // session from what we already know rather than locking the user out.
    if (e.status >= 500) {
      const fallback = await reconstructMe();
      if (fallback) return fallback;
    }
    throw e;
  }
}

export const hasSession = () => Boolean(tokens.access || tokens.refresh);

/* ── Profile ───────────────────────────────────────────────────── */

export const getProfile = () => http.get('/me/profile');

/** PUT /me/profile — dateOfBirth and gender are required by the server. */
export const saveProfile = (profile) => http.put('/me/profile', profile);

/* ── Username ──────────────────────────────────────────────────── */

export const getUsername = () => http.get('/me/username');

export const changeUsername = (username) => http.put('/me/username', { username });

/** Server picks a fresh random handle. */
export const rerollUsername = () => http.post('/me/username/reroll');

export const usernameSuggestions = () => http.get('/usernames/suggestions');
