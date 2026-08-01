/**
 * Money formatting.
 *
 * ── IMPORTANT ──────────────────────────────────────────────────
 * The *amounts* come from the server. This module only controls how
 * they are written. If the backend still bills in one currency while
 * this displays another, the label lies about what is charged — so
 * `DISPLAY_CURRENCY` is a stopgap until the API returns XAF itself.
 *
 * ── Minor units ────────────────────────────────────────────────
 * XAF is a **zero-decimal** currency: there are no centimes, so 900
 * XAF is 900 — not 90000 "minor units". KES has 100 cents. Anything
 * that divides `amountMinor` by 100 is therefore wrong for XAF, which
 * is what `fromMinor()` below exists to get right.
 */

const env = import.meta.env ?? {};

/** Force a display currency, or leave blank to use whatever the API sends. */
export const DISPLAY_CURRENCY = env.VITE_CURRENCY ?? 'XAF';

/** Currencies with no fractional unit. */
const ZERO_DECIMAL = new Set(['XAF', 'XOF', 'JPY', 'KRW', 'VND', 'CLP', 'ISK', 'RWF', 'UGX', 'DJF', 'GNF', 'KMF']);

const LOCALE = { XAF: 'fr-CM', XOF: 'fr-SN', KES: 'en-KE', EUR: 'fr-FR', USD: 'en-US' };

export const currencyCode = (fromApi) => DISPLAY_CURRENCY || fromApi || 'XAF';

export const isZeroDecimal = (code) => ZERO_DECIMAL.has(currencyCode(code));

/** Minor units -> a real number, respecting zero-decimal currencies. */
export const fromMinor = (minor, code) =>
  (Number(minor) || 0) / (isZeroDecimal(code) ? 1 : 100);

/**
 * Major units -> minor, for sending a price the user typed back to the API.
 *
 * Rounded, because 12.005 in a number input must not become 1200.4999 cents
 * and be rejected by a validator that expects an integer.
 */
export const toMinor = (amount, code) =>
  Math.round((Number(amount) || 0) * (isZeroDecimal(code) ? 1 : 100));

/**
 * Format an amount already in major units.
 * `lang` picks the grouping/decimal separators — French uses a space and
 * a comma where English uses a comma and a point.
 */
export function formatAmount(amount, code, lang = 'en') {
  const cur = currencyCode(code);
  const zero = isZeroDecimal(cur);
  const locale = lang === 'fr' ? (LOCALE[cur]?.startsWith('fr') ? LOCALE[cur] : 'fr-FR') : LOCALE[cur] ?? 'en-US';

  const n = Number(amount) || 0;
  const body = n.toLocaleString(locale, {
    minimumFractionDigits: zero ? 0 : 2,
    maximumFractionDigits: zero ? 0 : 2,
  });

  // French convention puts the code after the amount.
  return lang === 'fr' ? `${body} ${cur}` : `${cur} ${body}`;
}

/** Format straight from minor units. */
export const formatMinor = (minor, code, lang) => formatAmount(fromMinor(minor, code), code, lang);

/**
 * Format a server-supplied `priceDisplay` string.
 *
 * The API sends it pre-formatted for its own currency ("900.00"), so the
 * trailing ".00" is dropped for zero-decimal currencies rather than
 * showing "900,00 XAF" for something that has no centimes.
 */
export function formatDisplay(priceDisplay, code, lang = 'en') {
  if (priceDisplay == null) return '';
  const numeric = Number(String(priceDisplay).replace(/[^\d.-]/g, ''));
  if (Number.isNaN(numeric)) return `${priceDisplay} ${currencyCode(code)}`;
  return formatAmount(numeric, code, lang);
}
