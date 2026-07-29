import { http } from './http';
export { formatMinor, formatDisplay, formatAmount, currencyCode } from './currency';

/**
 * Money.
 *
 *   GET  /billing/plans              PlanResponse — prices, currency, free preview count
 *   POST /billing/unlocks/{userId}   one-off unlock of a single member's profile
 *   POST /billing/subscriptions      { planCode } — WEEKLY | MONTHLY | QUARTERLY
 *   GET  /billing/purchases          the user's purchase history
 *   GET  /billing/entitlements       what they currently have access to
 *
 * Checkout is asynchronous. `POST` returns a CheckoutResponse whose
 * `action` says what the UI must do next:
 *
 *   REDIRECT          send the browser to `redirectUrl`
 *   PROMPT_ON_PHONE   an STK push is on its way — wait and poll
 *   MANUAL            show `instructions`; an admin settles it by hand
 *
 * In every case the purchase starts PENDING and flips to COMPLETED or
 * FAILED out of band, so callers poll `waitForSettlement`.
 */

export const plans = () => http.get('/billing/plans');

export const entitlements = () => http.get('/billing/entitlements');

export const purchases = () => http.get('/billing/purchases');

export const unlockProfile = (userId) => http.post(`/billing/unlocks/${userId}`);

export const subscribe = (planCode) => http.post('/billing/subscriptions', { planCode });

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
