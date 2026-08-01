import { http } from './http';
export { formatMinor, formatDisplay, formatAmount, currencyCode } from './currency';

/**
 * Money, in both directions.
 *
 * ── Viewers pay creators, per item ─────────────────────────────
 *   POST /billing/media/{mediaId}    buy one photo or video
 *   POST /billing/live/{sessionId}   buy entry to one broadcast
 *   GET  /billing/entitlements       trial, credit balance, items owned
 *   GET  /billing/purchases          payment history
 *
 * Each item carries its own price, set by its creator, and buying one buys
 * that one. There is no bundle and no all-access pass. The price arrives on
 * the item itself (`priceMinor` / `priceDisplay`), so nothing here guesses it.
 *
 * ── Creators pay the platform ──────────────────────────────────
 *   GET  /billing/creator-packages        BRONZE | SILVER | GOLD, cheapest first
 *   GET  /billing/creator-packages/mine   the package held + allowance left
 *   POST /billing/creator-packages        { packageCode }
 *
 * Every package covers photos and video; they differ on how many premium
 * videos, how many minutes of live per day, and placement in search.
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

/* ── Creator packages ──────────────────────────────────────────── */

export const creatorPackages = () => http.get('/billing/creator-packages');

/** The caller's package and remaining allowance. Creator accounts only. */
export const myPackage = () => http.get('/billing/creator-packages/mine');

export const buyCreatorPackage = (packageCode) =>
  http.post('/billing/creator-packages', { packageCode });

export const entitlements = () => http.get('/billing/entitlements');

export const purchases = () => http.get('/billing/purchases');

/** Buy one photo or video, at the price its creator set on it. */
export const unlockMedia = (mediaId) => http.post(`/billing/media/${mediaId}`);

/** Buy entry to one live broadcast. */
export const buyLiveAccess = (sessionId) => http.post(`/billing/live/${sessionId}`);

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

/**
 * Whether the caller can see an item.
 *
 * The server already decided — every gallery and listing carries a `locked`
 * flag per item — so this is only the free-trial shortcut a client uses to
 * decide whether to show a paywall at all.
 */
export const onTrial = (ent) => Boolean(ent?.onTrial);

export const creditBalance = (ent) => ent?.creditBalanceMinor ?? 0;
