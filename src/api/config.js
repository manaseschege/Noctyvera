/**
 * ─────────────────────────────────────────────────────────────
 *  INTEGRATION CONFIG
 * ─────────────────────────────────────────────────────────────
 *
 * The app talks to the Noctyvera API (Spring Boot, JWT bearer auth).
 * In dev, requests go through the Vite proxy declared in
 * vite.config.js, so the browser stays same-origin and the ngrok
 * interstitial is bypassed. In production, point VITE_API_BASE_URL
 * at the deployed gateway.
 *
 * Live spec: {tunnel}/swagger-ui/index.html
 * Raw spec:  {tunnel}/v3/api-docs
 */

const env = import.meta.env ?? {};

/** Base path for every call. Same-origin in dev via the proxy. */
export const API_BASE_URL = env.VITE_API_BASE_URL ?? '/api/v1';

/**
 * Fall back to the bundled fixtures instead of the network.
 * Off by default now that a real backend exists — set VITE_USE_MOCK=true
 * to demo the UI with no server running.
 */
export const USE_MOCK = env.VITE_USE_MOCK === 'true';

/* ── Domain vocabulary, mirrored from the OpenAPI enums ────────── */

export const ROLES = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
};

export const VERIFICATION = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
};

/** Server-driven onboarding — /me returns the step the user is on. */
export const NEXT_STEP = {
  CREATE_PROFILE: 'CREATE_PROFILE',
  SUBMIT_KYC: 'SUBMIT_KYC',
  AWAIT_REVIEW: 'AWAIT_REVIEW',
  RESUBMIT_KYC: 'RESUBMIT_KYC',
  DONE: 'DONE',
};

/**
 * Activation.
 *
 * A member who has passed the identity check must pay before the app opens
 * up. The backend has no dedicated activation product — PurchaseResponse.type
 * is only PROFILE_UNLOCK | SUBSCRIPTION — so the monthly subscription plan
 * is what's charged, and `entitlements.subscribed` is what's checked.
 */
export const ACTIVATION = {
  planCode: 'MONTHLY',
  /** Any active subscription satisfies the gate; the server can't distinguish. */
  isActivated: (entitlements) => Boolean(entitlements?.subscribed),
};

export const DOC_TYPES = [
  { value: 'PASSPORT', labelKey: 'enums.docType.PASSPORT', kinds: ['PASSPORT_PAGE'] },
  { value: 'NATIONAL_ID', labelKey: 'enums.docType.NATIONAL_ID', kinds: ['ID_FRONT', 'ID_BACK'] },
  { value: 'DRIVERS_LICENSE', labelKey: 'enums.docType.DRIVERS_LICENSE', kinds: ['ID_FRONT', 'ID_BACK'] },
];

/** Turn a [{value, labelKey}] list into antd options in the active language. */
export const localiseOptions = (list, t) =>
  list.map(({ value, labelKey }) => ({ value, label: t(labelKey) }));

/** Document kinds are keyed; resolve with t(`enums.docKind.${kind}`). */
export const DOC_KINDS = ['ID_FRONT', 'ID_BACK', 'PASSPORT_PAGE', 'SELFIE'];

/**
 * KYC `countryOfIssue` must be a 2-letter ISO 3166-1 alpha-2 code — the
 * server rejects full country names. Kenya first since that's the home market.
 */
export const COUNTRY_CODES = [
  { value: 'KE', label: 'Kenya' },
  { value: 'UG', label: 'Uganda' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'CM', label: 'Cameroon' },
  { value: 'EG', label: 'Egypt' },
  { value: 'MA', label: 'Morocco' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'PT', label: 'Portugal' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'PL', label: 'Poland' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'BR', label: 'Brazil' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'IN', label: 'India' },
  { value: 'CN', label: 'China' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
];

export const REJECTION_REASONS = [
  'DOCUMENT_UNREADABLE',
  'DOCUMENT_EXPIRED',
  'DETAILS_MISMATCH',
  'SELFIE_MISMATCH',
  'SUSPECTED_FORGERY',
  'UNDERAGE',
  'DUPLICATE_ACCOUNT',
  'OTHER',
].map((value) => ({ value, labelKey: `enums.rejection.${value}` }));

export const GENDERS = ['FEMALE', 'MALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'].map((value) => ({
  value,
  labelKey: `enums.gender.${value}`,
}));

export const VIBES = ['CLUBBING', 'BARS', 'LIVE_MUSIC', 'HOUSE_PARTIES', 'FESTIVALS', 'CHILL', 'ANYTHING'].map(
  (value) => ({ value, labelKey: `enums.vibe.${value}` }),
);

/**
 * Media tiers.
 *   FREE      anyone, signed out included — this is the shop window
 *   EXCLUSIVE locked until the viewer unlocks the creator or subscribes
 */
export const MEDIA_TIER = {
  FREE: 'FREE',
  EXCLUSIVE: 'EXCLUSIVE',
};

export const MEDIA_STATUS = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

/** Upload ceilings enforced client-side before we bother the server. */
export const UPLOAD_LIMITS = {
  photoMb: 15,
  videoMb: 512,
  docMb: 10,
};
