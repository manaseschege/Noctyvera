import { create } from 'zustand';
import { authApi, billingApi } from '../api';
import { ACCOUNT_TYPE, NEXT_STEP, ROLES, VERIFICATION } from '../api/config';
import { onAuthExpired, tokens } from '../api/http';

/**
 * Session state.
 *
 * The server is the authority on where a user is: `/me` returns `nextStep`,
 * `accountType`, `verificationStatus` and `canPostMedia`, and the app routes
 * off those rather than keeping its own state machine.
 *
 * ── Two kinds of account, two entirely different shapes ────────
 *
 * A **viewer** signs up and is finished. No profile, no documents, no
 * subscription to enter. They land on the feed and pay per creator, and
 * every guard below has to let them straight through — the old behaviour,
 * where everybody had to buy a monthly plan to see anything at all, is
 * what made a one-creator visit cost as much as a whole platform.
 *
 * A **creator** walks profile → identity → package, and only the package
 * gates publishing.
 */
export const useAuth = create((set, get) => ({
  user: null,
  entitlements: null,
  /** Guards must not decide on access until this is true. */
  entitlementsLoaded: false,

  /** Creator publishing rights. Null for viewers, who never need one. */
  packageStatus: null,
  packageLoaded: false,

  /**
   * An outstanding sign-in code. Set by login() when the server asks for
   * one, cleared once it is answered.
   */
  challenge: null,

  /** True until the first /me resolves, so guards don't bounce on reload. */
  booting: tokens.access || tokens.refresh ? true : false,
  busy: false,

  async boot() {
    if (!tokens.access && !tokens.refresh) {
      set({ booting: false, user: null });
      return null;
    }
    try {
      const user = await authApi.me();
      set({ user });
      if (user) await get().loadAccess(user);
      else set({ entitlementsLoaded: true, packageLoaded: true });
      return user;
    } catch {
      set({ user: null });
      return null;
    } finally {
      set({ booting: false });
    }
  },

  /**
   * Step one of signing in.
   *
   * Resolves to `{ otpRequired: true }` when a code has been emailed — the
   * caller shows the code screen and calls verifyCode() next. Resolves to
   * `{ otpRequired: false, user }` where codes are switched off.
   */
  async login(credentials) {
    set({ busy: true });
    try {
      const res = await authApi.login(credentials);
      if (res.otpRequired) {
        set({ challenge: res.challenge });
        return { otpRequired: true, challenge: res.challenge };
      }
      const user = await get().adopt();
      return { otpRequired: false, user };
    } finally {
      set({ busy: false });
    }
  },

  /** Step two. Exchanges the emailed code for a session. */
  async verifyCode(code) {
    const { challenge } = get();
    if (!challenge) throw new Error('That sign-in attempt has expired. Start again.');

    set({ busy: true });
    try {
      await authApi.verifyOtp({ ...challenge, code });
      const user = await get().adopt();
      set({ challenge: null });
      return user;
    } finally {
      set({ busy: false });
    }
  },

  /** Sends a fresh code for the outstanding challenge. */
  async resendCode() {
    const { challenge } = get();
    if (!challenge) throw new Error('That sign-in attempt has expired. Start again.');
    const next = await authApi.resendOtp(challenge.challengeId);
    // The id is stable; the expiry is not.
    set({ challenge: { ...challenge, ...next, email: challenge.email } });
    return next;
  },

  clearChallenge: () => set({ challenge: null }),

  async register(payload) {
    set({ busy: true });
    try {
      const res = await authApi.register(payload);
      const user = await get().adopt();
      return { user, ...res };
    } finally {
      set({ busy: false });
    }
  },

  async logout() {
    await authApi.logout();
    set({
      user: null,
      entitlements: null,
      entitlementsLoaded: false,
      packageStatus: null,
      packageLoaded: false,
      challenge: null,
    });
  },

  /** Re-read /me — call after profile save, KYC submit, or an approval. */
  async refresh() {
    const user = await authApi.me();
    set({ user });
    return user;
  },

  /**
   * Re-read /me and, when the verification verdict has actually moved, reload
   * everything that hangs off it.
   *
   * The server decides verification per request — the filter loads the account
   * fresh, so an approval is live the moment a moderator saves it. Only the
   * client was stale, which is why being approved used to mean signing out and
   * back in: nothing refetched `/me`, so the guards kept reading the status
   * captured at login.
   *
   * Returns the new status when it changed, otherwise null, so a caller can
   * announce it. Never throws: this runs on a timer and a failed poll should
   * be a no-op, not an error in someone's face.
   */
  async syncVerification() {
    const before = get().user;
    if (!before) return null;

    let user;
    try {
      user = await authApi.me();
    } catch {
      return null;
    }
    if (!user) return null;

    const changed = user.verificationStatus !== before.verificationStatus;
    set({ user });
    // Publishing rights and entitlements are downstream of the verdict, so a
    // fresh /me alone would leave the studio still believing it is locked.
    if (changed) await get().loadAccess(user);
    return changed ? user.verificationStatus : null;
  },

  /** Reads /me and everything that depends on who the user turns out to be. */
  async adopt() {
    const user = await authApi.me();
    set({ user });
    if (user) await get().loadAccess(user);
    return user;
  },

  /**
   * Loads whichever access facts this account actually has.
   *
   * A viewer has entitlements and no package; a creator has both. Asking for
   * a package as a viewer is a guaranteed 403, so it is skipped rather than
   * caught.
   */
  async loadAccess(user) {
    const who = user ?? get().user;
    const jobs = [get().loadEntitlements()];
    if (who && who.accountType === ACCOUNT_TYPE.CREATOR) {
      jobs.push(get().loadPackage());
    } else {
      set({ packageStatus: null, packageLoaded: true });
    }
    await Promise.all(jobs);
  },

  async loadEntitlements() {
    try {
      const entitlements = await billingApi.entitlements();
      set({ entitlements, entitlementsLoaded: true });
      return entitlements;
    } catch {
      // Treat an unreadable entitlement as "not unlocked" rather than
      // letting someone through on a network blip.
      set({ entitlementsLoaded: true });
      return null;
    }
  },

  async loadPackage() {
    try {
      const packageStatus = await billingApi.myPackage();
      set({ packageStatus, packageLoaded: true });
      return packageStatus;
    } catch {
      set({ packageLoaded: true });
      return null;
    }
  },

  patchUser(patch) {
    const { user } = get();
    if (user) set({ user: { ...user, ...patch } });
  },
}));

/* Bounce to a signed-out state when a refresh token finally dies. */
onAuthExpired(() =>
  useAuth.setState({
    user: null,
    entitlements: null,
    entitlementsLoaded: false,
    packageStatus: null,
    packageLoaded: false,
  }),
);

/* ── Role & status helpers ─────────────────────────────────────── */

export const isAdmin = (u) => u?.role === ROLES.ADMIN;
export const isModerator = (u) => u?.role === ROLES.MODERATOR;
/** Anyone who can open the staff console. */
export const isStaff = (u) => isAdmin(u) || isModerator(u);

export const isCreator = (u) => u?.accountType === ACCOUNT_TYPE.CREATOR;
/** Anyone who is not a creator is here to watch, which is most people. */
export const isViewer = (u) => Boolean(u) && !isCreator(u);

export const isVerified = (u) => u?.verificationStatus === VERIFICATION.APPROVED;
export const canPost = (u) => Boolean(u?.canPostMedia);
export const isSuspended = (u) => u?.status === 'SUSPENDED' || u?.status === 'DEACTIVATED';

/**
 * A verified creator who has not bought a package yet.
 *
 * Only ever true for creators. A viewer buying a publishing package would be
 * paying for something they will never use.
 */
export function needsPackage(user, packageStatus) {
  if (!user || isStaff(user) || !isCreator(user)) return false;
  if (!isVerified(user)) return false;
  // Absent status means it could not be read; assume covered rather than
  // pushing a paying creator at a payment screen on a network blip.
  if (!packageStatus) return false;
  if (!packageStatus.packagesRequired) return false;
  return !packageStatus.active;
}

/** True while the 7-day free trial is running. Everything is open until it ends. */
export const onTrial = (entitlements) => Boolean(entitlements?.onTrial);

/** Spendable referral credit, in minor units. */
export const creditOf = (entitlements) => entitlements?.creditBalanceMinor ?? 0;

/** Where a signed-in user belongs right now. */
export function homeFor(user, access = {}) {
  if (!user) return '/';
  if (isStaff(user)) return '/admin';

  // Viewers are done the moment they have an account.
  if (!isCreator(user)) return '/discover';

  switch (user.nextStep) {
    case NEXT_STEP.CREATE_PROFILE:
      return '/onboarding/profile';
    case NEXT_STEP.SUBMIT_KYC:
    case NEXT_STEP.RESUBMIT_KYC:
      return '/onboarding/verify';
    case NEXT_STEP.AWAIT_REVIEW:
      return '/onboarding/status';
    case NEXT_STEP.BROWSE:
      return '/discover';
    default:
      return needsPackage(user, access.packageStatus) ? '/onboarding/package' : '/studio';
  }
}

/** True when there is nothing left in the onboarding funnel. */
export const onboardingComplete = (u) =>
  !u || !isCreator(u) || u.nextStep === NEXT_STEP.DONE || u.nextStep === NEXT_STEP.BROWSE;

export const ROLE_LABEL = {
  [ROLES.USER]: 'Member',
  [ROLES.MODERATOR]: 'Moderator',
  [ROLES.ADMIN]: 'Admin',
};

export const VERIFICATION_LABEL = {
  [VERIFICATION.UNVERIFIED]: 'Unverified',
  [VERIFICATION.PENDING_REVIEW]: 'In review',
  [VERIFICATION.APPROVED]: 'Verified',
  [VERIFICATION.REJECTED]: 'Rejected',
};

export const VERIFICATION_COLOR = {
  [VERIFICATION.UNVERIFIED]: 'default',
  [VERIFICATION.PENDING_REVIEW]: 'gold',
  [VERIFICATION.APPROVED]: 'green',
  [VERIFICATION.REJECTED]: 'red',
};

export const STATUS_COLOR = {
  ACTIVE: 'green',
  SUSPENDED: 'volcano',
  DEACTIVATED: 'default',
};
