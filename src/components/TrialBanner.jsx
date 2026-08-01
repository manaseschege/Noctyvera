import { Link } from 'react-router-dom';
import { ClockCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { isCreator, useAuth } from '../store/auth';
import { useT } from '../i18n/useT';

/**
 * The seven free days, counting down.
 *
 * Shown only in the last stretch rather than for the whole week. A banner that
 * is always there stops being read by day two, and the point is to be noticed on
 * the day it matters — a trial that ends as a surprise is how somebody loses
 * access mid-scroll and decides the site is broken.
 */
const WARN_WITHIN_DAYS = 3;

export default function TrialBanner() {
  const t = useT();
  const { user, entitlements } = useAuth();

  const endsAt = entitlements?.trialEndsAt ?? user?.trialEndsAt;
  if (!user || !entitlements?.onTrial || !endsAt) return null;

  const daysLeft = dayjs(endsAt).diff(dayjs(), 'day');
  if (daysLeft > WARN_WITHIN_DAYS) return null;

  const hoursLeft = dayjs(endsAt).diff(dayjs(), 'hour');
  const remaining = daysLeft >= 1
    ? t('trial.daysLeft', { count: daysLeft })
    : t('trial.hoursLeft', { count: Math.max(1, hoursLeft) });

  return (
    <div className="trial-banner" role="status">
      <ClockCircleFilled />
      <span>
        <strong>{remaining}</strong>{' '}
        {isCreator(user) ? t('trial.creatorBody') : t('trial.viewerBody')}
      </span>
      <Link to={isCreator(user) ? '/studio/packages' : '/discover'} className="trial-banner-cta">
        {isCreator(user) ? t('trial.creatorCta') : t('trial.viewerCta')}
      </Link>
    </div>
  );
}
