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
 *   GET  /billing/creator-packages        PRO | DIAMOND | BLACK_DIAMOND, cheapest first
 *   GET  /billing/creator-packages/mine   the package held + allowance left
 *   POST /billing/creator-packages        { packageCode, payerMsisdn }
 *
 * Every package covers photos and video; they differ on how many premium
 * videos, how many minutes of live per day, and placement in search.
 *
 * ── Paying ─────────────────────────────────────────────────────
 * Every `POST` here takes an optional `payerMsisdn` and returns a
 * CheckoutResponse whose `action` says what to do next:
 *
 *   NONE              already paid — nothing to do, nothing to poll
 *   REDIRECT          send the browser to `redirectUrl`
 *   PROMPT_ON_PHONE   a prompt is on its way to the handset — wait and poll
 *   MANUAL            show `instructions`; an admin settles it by hand
 *
 * On MTN Mobile Money — the configured provider — every purchase comes back
 * `PROMPT_ON_PHONE` and `PENDING`. Nothing settles in the request: the payer
 * approves on their handset whenever they get to it, and the purchase flips
 * later via callback or reconciliation. So callers must poll
 * `waitForSettlement` and must not grant access on the POST alone.
 *
 * `payerMsisdn` is required by mobile money and ignored by every other
 * provider, so a client that always sends it is correct either way. Ask for it
 * only when `requiresPayerMsisdn(entitlements)` says to — the server reports
 * which provider is live rather than the client guessing.
 *
 * Use `isSettled(checkout)` rather than testing `action` directly — it also
 * covers a provider that happens to settle before the response is written.
 */

/* ── Creator packages ──────────────────────────────────────────── */

export const creatorPackages = () => http.get('/billing/creator-packages');

/** The caller's package and remaining allowance. Creator accounts only. */
export const myPackage = () => http.get('/billing/creator-packages/mine');

export const buyCreatorPackage = (packageCode, { method, payerMsisdn } = {}) =>
  http.post('/billing/creator-packages', { packageCode, method, payerMsisdn });

export const entitlements = () => http.get('/billing/entitlements');

/**
 * The ways this deployment can take money, as the picker should render them.
 *
 * Each entry is `{ code, label, description, requiresPayerMsisdn, isDefault,
 * clientKey }`. Read `requiresPayerMsisdn` per method rather than assuming
 * mobile money is the only one that needs a number — which method wants what
 * moves when a provider is swapped, and the server is the one that knows.
 */
export const paymentMethods = () => http.get('/billing/payment-methods');

export const purchases = () => http.get('/billing/purchases');

/** Buy one photo or video, at the price its creator set on it. */
export const unlockMedia = (mediaId, { method, payerMsisdn } = {}) =>
  http.post(`/billing/media/${mediaId}`, { method, payerMsisdn });

/** Buy entry to one live broadcast. */
export const buyLiveAccess = (sessionId, { method, payerMsisdn } = {}) =>
  http.post(`/billing/live/${sessionId}`, { method, payerMsisdn });

/** True when a checkout response already represents a paid purchase. */
export const isSettled = (checkout) =>
  checkout?.action === 'NONE' || checkout?.purchase?.status === 'COMPLETED';

/** Resolves after `ms`, or as soon as `signal` aborts — whichever is first. */
const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
  });

/**
 * Poll a pending purchase until it settles.
 *
 * Resolves with the final PurchaseResponse, or the last known state if it is
 * still pending when the window closes — never rejects. A caller therefore has
 * to check `status` rather than assuming a resolve means success.
 *
 * The window is three minutes because the payer is approving this on a handset:
 * they have to notice the prompt, unlock the phone and enter a PIN. Running out
 * is not a failure — the purchase is still PENDING server-side and settles by
 * callback whenever they get to it — so the caller should say "still waiting"
 * rather than "declined".
 */
export async function waitForSettlement(purchaseId, { intervalMs = 3000, timeoutMs = 180000, signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;

  while (Date.now() < deadline && !signal?.aborted) {
    try {
      const all = await purchases();
      const page = Array.isArray(all) ? all : all?.content ?? [];
      last = page.find((p) => p.id === purchaseId) ?? last;
      if (last && last.status !== 'PENDING') return last;
    } catch {
      // A dropped request says nothing about the payment — the handset prompt
      // is still live and the server is still the authority. Keep polling; the
      // deadline is what ends this, not one bad response.
    }
    await sleep(intervalMs, signal);
  }
  return last;
}

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

/* ── Mobile Money ──────────────────────────────────────────────── */

/**
 * Whether the *default* method needs a phone number.
 *
 * Only right when the buyer has not chosen a method. Once a picker is on screen
 * the answer is per method — read `requiresPayerMsisdn` off the selected entry
 * from {@link paymentMethods} instead, or Stripe users get asked for a handset.
 */
export const requiresPayerMsisdn = (ent) => Boolean(ent?.requiresPayerMsisdn);

export const paymentProvider = (ent) => ent?.paymentProvider ?? null;

/**
 * The one shape the server's `payerMsisdn` pattern accepts, applied here so a
 * typo is caught before it costs a round trip. Deliberately permissive about
 * spacing and a leading plus, because that is how people write the number down
 * — the server strips both.
 */
export const MSISDN_PATTERN = /^\+?[0-9][0-9 ()-]{7,19}$/;

export const isValidMsisdn = (value) => MSISDN_PATTERN.test((value ?? '').trim());

/**
 * The last number that was actually charged, offered as the default next time.
 *
 * Kept in localStorage rather than on the account: it is a convenience, and the
 * handset that pays is not necessarily the one the account was opened with, so
 * it stays a per-device suggestion the payer can overwrite.
 */
const MSISDN_KEY = 'noctyvera.payerMsisdn';

export function rememberMsisdn(value) {
  try {
    if (isValidMsisdn(value)) localStorage.setItem(MSISDN_KEY, value.trim());
  } catch {
    // Private browsing, or storage full. Losing a convenience is not worth
    // failing a purchase over.
  }
}

export function lastMsisdn() {
  try {
    return localStorage.getItem(MSISDN_KEY) ?? '';
  } catch {
    return '';
  }
}
