import { useEffect, useRef } from 'react';
import { App } from 'antd';
import { useAuth } from '../store/auth';
import { VERIFICATION } from '../api/config';
import { useT } from '../i18n/useT';

/**
 * Notices an identity verdict wherever the user happens to be standing.
 *
 * The onboarding status screen polls, but approvals do not wait for anyone to
 * be looking at that page — a moderator can approve while the user is browsing
 * the feed, or with the tab in the background. Without this, the app kept
 * showing "not verified" until a full reload, so the workaround was to sign out
 * and back in.
 *
 * Two triggers, because they cover different absences:
 *  · returning to the tab, which is when someone who wandered off comes back
 *  · a slow poll, for a tab left open and watched
 *
 * The poll only runs while a verdict is actually outstanding. Once approved or
 * rejected there is nothing left to wait for, and polling forever would be a
 * request per user per interval for no reason.
 */
export default function VerificationWatcher() {
  const t = useT();
  const { message } = App.useApp();
  const user = useAuth((s) => s.user);
  const syncVerification = useAuth((s) => s.syncVerification);

  const status = user?.verificationStatus;
  const waiting = status === VERIFICATION.PENDING_REVIEW || status === VERIFICATION.UNVERIFIED;

  // Kept in a ref so the effect does not re-subscribe every time antd hands
  // back a new message instance.
  const announce = useRef(null);
  announce.current = (next) => {
    if (next === VERIFICATION.APPROVED) message.success(t('onboarding.approvedNow'));
    else if (next === VERIFICATION.REJECTED) message.warning(t('onboarding.rejectedNow'));
  };

  useEffect(() => {
    if (!user) return undefined;

    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      const next = await syncVerification();
      if (next && !stopped) announce.current?.(next);
    };

    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    const timer = waiting ? setInterval(check, 20000) : null;

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      if (timer) clearInterval(timer);
    };
  }, [user, waiting, syncVerification]);

  return null;
}
