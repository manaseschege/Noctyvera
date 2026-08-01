import { ACCOUNT_TYPE, NEXT_STEP, VERIFICATION } from './config';
import { http, tokens } from './http';

/**
 * Auth + identity.
 *
 * ── Signing in takes two calls ─────────────────────────────────
 *   POST /auth/login       -> { otpRequired, challengeId, maskedEmail }
 *   POST /auth/otp/verify  -> AuthResponse (tokens)
 *
 * A correct password does not produce a session on its own. It produces a
 * challenge, and a six-digit code goes to the address on the account. Only
 * that code exchanges for tokens.
 *
 * When `otpRequired` is false, codes are switched off in that environment
 * and the tokens are already in `auth` — `login()` below normalises both
 * shapes so callers branch once.
 *
 * ── Registering takes one ──────────────────────────────────────
 *   POST /auth/register    -> { auth, emailVerification }
 *
 * The account is signed in immediately. A confirmation code is sent
 * alongside, but nothing waits on it: somebody who came to look at one
 * creator should be looking at her seconds after submitting the form.
 */

/**
 * The last AuthResponse, kept so the app can still work when GET /me is
 * unavailable. login/register return the same identity fields, so we can
 * reconstruct the session from them.
 *
 * BACKEND BUG (2026-07-29): GET /me returned 500 for any account that has
 * a profile. Remove this fallback once that is confirmed fixed.
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
function deriveNextStep({ accountType, profileComplete, verificationStatus }) {
  // A viewer has nothing to complete, ever.
  if (accountType !== ACCOUNT_TYPE.CREATOR) return NEXT_STEP.BROWSE;
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

  const accountType = id.accountType ?? ACCOUNT_TYPE.VIEWER;

  return {
    id: id.userId,
    email: id.email ?? null,
    username,
    accountType,
    role: id.role,
    status: 'ACTIVE',
    verificationStatus,
    emailVerified: id.emailVerified ?? false,
    profileComplete,
    canPostMedia: verificationStatus === VERIFICATION.APPROVED,
    nextStep: deriveNextStep({ accountType, profileComplete, verificationStatus }),
    degraded: true, // the UI can note that /me was unavailable
  };
}

/** Stores tokens and caches identity from an AuthResponse. */
function acceptSession(auth, email) {
  tokens.set(auth);
  cacheIdentity(email ? { ...auth, email } : auth);
  return auth;
}

/* ── Registration ──────────────────────────────────────────────── */

/**
 * @param accountType VIEWER (default) or CREATOR — decides the whole path
 *                    the app puts them on afterwards.
 * @returns { auth, emailVerification } — `auth` already holds working tokens
 */
export async function register({ email, password, accountType = ACCOUNT_TYPE.VIEWER }) {
  const res = await http.post('/auth/register', { email, password, accountType }, { auth: false });
  acceptSession(res.auth, email);
  return res;
}

/* ── Sign-in ───────────────────────────────────────────────────── */

/**
 * Step one. Checks the password and sends the code.
 *
 * Normalised so callers branch on one field:
 *   { otpRequired: true,  challenge: {...} }   show the code screen
 *   { otpRequired: false, auth: {...} }        already signed in
 */
export async function login({ email, password }) {
  const res = await http.post('/auth/login', { email, password }, { auth: false });

  if (res.otpRequired) {
    return {
      otpRequired: true,
      challenge: {
        challengeId: res.challengeId,
        expiresAt: res.expiresAt,
        maskedEmail: res.maskedEmail,
        codeLength: res.codeLength,
        // Kept so the session can be cached under the right address once the
        // code comes back — the server only ever returns it masked.
        email,
      },
    };
  }

  return { otpRequired: false, auth: acceptSession(res.auth, email) };
}

/** Step two. Exchanges the emailed code for a session. */
export async function verifyOtp({ challengeId, code, email }) {
  const auth = await http.post('/auth/otp/verify', { challengeId, code }, { auth: false });
  return acceptSession(auth, email);
}

/** Sends a fresh code. The previous one stops working immediately. */
export const resendOtp = (challengeId) =>
  http.post('/auth/otp/resend', { challengeId }, { auth: false });

/* ── Email confirmation ────────────────────────────────────────── */

/** Answers the challenge from registration. Optional — nothing is gated on it. */
export const verifyEmail = ({ challengeId, code }) =>
  http.post('/auth/email/verify', { challengeId, code }, { auth: false });

/** A new confirmation code, for a signed-in user who never finished. */
export const requestEmailCode = () => http.post('/auth/email/request-code');

/* ── Session ───────────────────────────────────────────────────── */

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
    // Rebuild the session from what we already know rather than locking the
    // user out over a server-side error.
    if (e.status >= 500) {
      const fallback = await reconstructMe();
      if (fallback) return fallback;
    }
    throw e;
  }
}

export const hasSession = () => Boolean(tokens.access || tokens.refresh);

/** Turns a viewer account into a creator one. Keeps handle, purchases, history. */
export const becomeCreator = () => http.post('/me/become-creator');

/* ── Profile ───────────────────────────────────────────────────── */

export const getProfile = () => http.get('/me/profile');

/**
 * PUT /me/profile — dateOfBirth and gender are required by the server.
 * `unlockPriceMinor` is optional; omitting it leaves the existing price alone.
 */
export const saveProfile = (profile) => http.put('/me/profile', profile);

/* ── Username ──────────────────────────────────────────────────── */

export const getUsername = () => http.get('/me/username');

export const changeUsername = (username) => http.put('/me/username', { username });

/** Server picks a fresh random handle. */
export const rerollUsername = () => http.post('/me/username/reroll');

export const usernameSuggestions = () => http.get('/usernames/suggestions');
