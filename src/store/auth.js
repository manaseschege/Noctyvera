import { create } from 'zustand';
import { authApi, billingApi } from '../api';
import { ACTIVATION, NEXT_STEP, ROLES, VERIFICATION } from '../api/config';
import { onAuthExpired, tokens } from '../api/http';

/**
 * Session state.
 *
 * The server is the authority on where a user is in onboarding: `/me`
 * returns `nextStep`, `verificationStatus` and `canPostMedia`, and the
 * app routes off those rather than keeping its own state machine.
 */
export const useAuth = create((set, get) => ({
  user: null,
  entitlements: null,
  /** Guards must not decide on activation until this is true. */
  entitlementsLoaded: false,
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
      if (user) await get().loadEntitlements();
      else set({ entitlementsLoaded: true });
      return user;
    } catch {
      set({ user: null });
      return null;
    } finally {
      set({ booting: false });
    }
  },

  async login(credentials) {
    set({ busy: true });
    try {
      await authApi.login(credentials);
      const user = await authApi.me();
      set({ user });
      await get().loadEntitlements();
      return user;
    } finally {
      set({ busy: false });
    }
  },

  async register(payload) {
    set({ busy: true });
    try {
      const auth = await authApi.register(payload);
      const user = await authApi.me();
      set({ user });
      return { user, auth };
    } finally {
      set({ busy: false });
    }
  },

  async logout() {
    await authApi.logout();
    set({ user: null, entitlements: null, entitlementsLoaded: false });
  },

  /** Re-read /me — call after profile save, KYC submit, or an approval. */
  async refresh() {
    const user = await authApi.me();
    set({ user });
    return user;
  },

  async loadEntitlements() {
    try {
      const entitlements = await billingApi.entitlements();
      set({ entitlements, entitlementsLoaded: true });
      return entitlements;
    } catch {
      // Treat an unreadable entitlement as "not activated" rather than
      // letting someone through on a network blip.
      set({ entitlementsLoaded: true });
      return null;
    }
  },

  patchUser(patch) {
    const { user } = get();
    if (user) set({ user: { ...user, ...patch } });
  },
}));

/* Bounce to a signed-out state when a refresh token finally dies. */
onAuthExpired(() => useAuth.setState({ user: null, entitlements: null, entitlementsLoaded: false }));

/* ── Role & status helpers ─────────────────────────────────────── */

export const isAdmin = (u) => u?.role === ROLES.ADMIN;
export const isModerator = (u) => u?.role === ROLES.MODERATOR;
/** Anyone who can open the staff console. */
export const isStaff = (u) => isAdmin(u) || isModerator(u);

export const isVerified = (u) => u?.verificationStatus === VERIFICATION.APPROVED;
export const canPost = (u) => Boolean(u?.canPostMedia);
export const isSuspended = (u) => u?.status === 'SUSPENDED' || u?.status === 'DEACTIVATED';

export const isActivated = (entitlements) => ACTIVATION.isActivated(entitlements);

/**
 * Identity approved but the activation payment hasn't gone through, so the
 * app stays shut. Staff are exempt.
 */
export function needsActivation(user, entitlements) {
  if (!user || isStaff(user)) return false;
  if (user.nextStep !== NEXT_STEP.DONE) return false;
  return !isActivated(entitlements);
}

/** Where a signed-in user belongs right now. */
export function homeFor(user, entitlements) {
  if (!user) return '/';
  if (isStaff(user)) return '/admin';
  switch (user.nextStep) {
    case NEXT_STEP.CREATE_PROFILE:
      return '/onboarding/profile';
    case NEXT_STEP.SUBMIT_KYC:
    case NEXT_STEP.RESUBMIT_KYC:
      return '/onboarding/verify';
    case NEXT_STEP.AWAIT_REVIEW:
      return '/onboarding/status';
    default:
      // Every verified member can post, so the studio is their home.
      return isActivated(entitlements) ? '/studio' : '/onboarding/activate';
  }
}

/** True when onboarding is finished and the app proper is available. */
export const onboardingComplete = (u) => !u || u.nextStep === NEXT_STEP.DONE;

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
