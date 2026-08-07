import { http, pageQuery } from './http';

/**
 * Live sessions.
 *
 *   GET  /live                      paged directory of sessions
 *   GET  /live/{id}/playback        playback URL — entitlement-gated
 *   GET  /me/live                   the host's own sessions
 *   POST /me/live                   create { title, playbackUrl?, scheduledFor? }
 *   POST /me/live/{id}/start        SCHEDULED -> LIVE
 *   POST /me/live/{id}/end          LIVE -> ENDED
 *
 * A session carries `locked`; the playback endpoint is what actually
 * enforces it, so the UI treats a 402/403 there as "needs to pay".
 */

export async function directory({ page = 0, size = 24 } = {}) {
  const res = await http.get(`/live?${pageQuery({ page, size })}`);
  return {
    items: res.content ?? [],
    total: res.totalElements ?? 0,
    last: res.last ?? true,
  };
}

/** Returns the playback payload, or null when the caller isn't entitled. */
export async function playback(sessionId) {
  try {
    return await http.get(`/live/${sessionId}/playback`);
  } catch (e) {
    if (e.status === 402 || e.status === 403) return null;
    throw e;
  }
}

export const mine = () => http.get('/me/live');

export const create = ({ title, playbackUrl, scheduledFor }) =>
  http.post('/me/live', { title, playbackUrl, scheduledFor });

export const start = (sessionId) => http.post(`/me/live/${sessionId}/start`);

export const end = (sessionId) => http.post(`/me/live/${sessionId}/end`);

export const isLive = (s) => s?.status === 'LIVE';

/* ── The daily allowance ───────────────────────────────────────── */

/**
 * How many live minutes are left today.
 *
 * `remainingMinutes` counts a broadcast that is on air right now, so it falls
 * while streaming — poll it during a session to warn before the cut-off rather
 * than after it.
 */
export const allowance = () => http.get('/me/live/allowance');

/**
 * Buy extra minutes for today.
 *
 * A CheckoutResponse like any other purchase: on mobile money it comes back
 * PENDING and **the minutes are not granted until it settles**, so poll with
 * `billingApi.waitForSettlement` before telling anyone they can keep going.
 */
export const extend = (minutes, { method, payerMsisdn } = {}) =>
  http.post('/me/live/extend', { minutes, method, payerMsisdn });
