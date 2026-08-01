import { http } from './http';
export { formatMinor, formatDisplay, formatAmount, currencyCode } from './currency';

/**
 * Money, in both directions.
 *
 * ── Viewers pay creators ───────────────────────────────────────
 *   GET  /billing/plans              prices, currency, the default unlock price
 *   POST /billing/unlocks/{userId}   unlock one creator, at *her* price
 *   POST /billing/subscriptions      { planCode } — unlocks everybody
 *   GET  /billing/entitlements       what the caller currently has access to
 *   GET  /billing/purchases          payment history
 *
 * An unlock is one payment for one creator and it opens everything she has
 * posted — there is no photo tier and no video tier. Each creator sets her
 * own price, which arrives on her profile and on her feed card as
 * `unlockPriceMinor`, so nothing here has to guess it.
 *
 * ── Creators pay the platform ──────────────────────────────────
 *   GET  /billing/creator-packages        BRONZE | SILVER | GOLD, cheapest first
 *   GET  /billing/creator-packages/mine   the package held + allowance left
 *   POST /billing/creator-packages        { packageCode }
 *
 * Bronze covers photos, silver covers video, gold covers both, and each
 * carries its own allowance.
 *
 * ── Checkout is asynchronous ───────────────────────────────────
 * Every `POST` returns a CheckoutResponse whose `action` says what to do:
 *
 *   NONE              already paid — nothing to do, nothing to poll
 *   REDIRECT          send the browser to `redirectUrl`
 *   PROMPT_ON_PHONE   an STK push is on its way — wait and poll
 *   MANUAL            show `instructions`; an admin settles it by hand
 *
 * `NONE` is the configured default today: the server settles on the spot and
 * the purchase comes back `COMPLETED`, so the client should grant access
 * immediately rather than opening a waiting screen. The other three all start
 * `PENDING` and flip out of band, so callers poll `waitForSettlement`.
 *
 * Use `isSettled(checkout)` rather than testing `action` directly — it also
 * covers a provider that happens to settle before the response is written.
 */

export const plans = () => http.get('/billing/plans');

/* ── Creator packages ──────────────────────────────────────────── */

export const creatorPackages = () => http.get('/billing/creator-packages');

/** The caller's package and remaining allowance. Creator accounts only. */
export const myPackage = () => http.get('/billing/creator-packages/mine');

export const buyCreatorPackage = (packageCode) =>
  http.post('/billing/creator-packages', { packageCode });

export const entitlements = () => http.get('/billing/entitlements');

export const purchases = () => http.get('/billing/purchases');

export const unlockProfile = (userId) => http.post(`/billing/unlocks/${userId}`);

export const subscribe = (planCode) => http.post('/billing/subscriptions', { planCode });

/** True when a checkout response already represents a paid purchase. */
export const isSettled = (checkout) =>
  checkout?.action === 'NONE' || checkout?.purchase?.status === 'COMPLETED';

/**
 * Poll a pending purchase until it settles.
 * Resolves with the final PurchaseResponse, or the last known state if
 * it is still pending when the window closes.
 */
export async function waitForSettlement(purchaseId, { intervalMs = 3000, timeoutMs = 120000, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline) {
    if (signal?.aborted) return last;
    const all = await purchases();
    last = (Array.isArray(all) ? all : all?.content ?? []).find((p) => p.id === purchaseId) ?? last;
    if (last && last.status !== 'PENDING') return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return last;
}

/** Minor units -> display string. The server also sends `priceDisplay`. */

/** ISO-8601 duration (PT720H) -> "30 days". */
export function humanDuration(iso) {
  if (!iso) return '';
  const hours = Number(/PT(\d+)H/.exec(iso)?.[1] ?? 0);
  if (!hours) return iso;
  if (hours % 24 === 0) {
    const days = hours / 24;
    if (days % 7 === 0 && days > 7) return `${days / 7} weeks`;
    if (days === 7) return '1 week';
    if (days === 1) return '1 day';
    return `${days} days`;
  }
  return `${hours} hours`;
}

export const isUnlocked = (ent, userId) =>
  Boolean(ent?.subscribed) || Boolean(ent?.unlockedMembers?.some((m) => m.userId === userId));
