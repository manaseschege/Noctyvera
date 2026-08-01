import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import {
  canPost,
  homeFor,
  isCreator,
  isStaff,
  needsPackage,
  onboardingComplete,
  useAuth,
} from '../store/auth';
import { useT } from '../i18n/useT';

/** Held while the first /me is in flight, so a reload doesn't bounce. */
function Booting() {
  return (
    <div className="center-page">
      <Spin size="large" />
    </div>
  );
}

/** Everything a guard needs to decide, in one read. */
function useAccess() {
  const { user, entitlements, packageStatus, packageLoaded, booting } = useAuth();
  return { user, booting, packageLoaded, access: { entitlements, packageStatus } };
}

/** Requires a session. `staff` restricts to MODERATOR/ADMIN. */
export function RequireAuth({ staff = false }) {
  const t = useT();
  const { user, booting, access } = useAccess();
  const location = useLocation();

  if (booting) return <Booting />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (staff && !isStaff(user)) {
    return (
      <div className="center-page">
        <Result
          status="403"
          title={t('guards.forbidden')}
          subTitle={t('guards.forbiddenBody')}
          extra={
            <Button type="primary" href={homeFor(user, access)}>
              {t('guards.takeMeBack')}
            </Button>
          }
        />
      </div>
    );
  }
  return <Outlet />;
}

/**
 * The app proper.
 *
 * A viewer is always through: there is nothing for them to finish, and
 * nothing for them to buy just to get in. A creator who has not finished
 * onboarding is sent to whichever step the server says they are on.
 */
export function RequireOnboarded() {
  const { user, booting, access } = useAccess();
  const location = useLocation();

  if (booting) return <Booting />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isStaff(user)) return <Outlet />;
  if (!onboardingComplete(user)) return <Navigate to={homeFor(user, access)} replace />;
  return <Outlet />;
}

/**
 * The studio: creators only, identity approved, package in hand.
 *
 * Publishing is what a package pays for, so this is the one place it is
 * checked client-side. The server checks it again on every upload.
 */
export function RequireVerified() {
  const { user, booting, access, packageLoaded } = useAccess();

  if (booting) return <Booting />;
  if (!user) return <Navigate to="/login" replace />;
  // A viewer has no studio to be in.
  if (!isCreator(user) && !isStaff(user)) return <Navigate to="/discover" replace />;
  if (!canPost(user)) return <Navigate to={homeFor(user, access)} replace />;
  if (!packageLoaded) return <Booting />;
  if (needsPackage(user, access.packageStatus)) return <Navigate to="/onboarding/package" replace />;
  return <Outlet />;
}

/**
 * The onboarding funnel itself. Creators partway through — and once
 * finished, these screens are no longer reachable.
 */
export function RequireOnboarding() {
  const { user, booting, access, packageLoaded } = useAccess();

  if (booting) return <Booting />;
  if (!user) return <Navigate to="/login" replace />;
  if (isStaff(user)) return <Navigate to="/admin" replace />;
  // Viewers never enter the funnel.
  if (!isCreator(user)) return <Navigate to="/discover" replace />;

  if (onboardingComplete(user)) {
    if (!packageLoaded) return <Booting />;
    if (!needsPackage(user, access.packageStatus)) return <Navigate to="/studio" replace />;
  }
  return <Outlet />;
}

/** Keeps an authenticated user off the login/register screens. */
export function RedirectIfAuthed({ children }) {
  const { user, booting, access } = useAccess();
  if (booting) return <Booting />;
  if (user) return <Navigate to={homeFor(user, access)} replace />;
  return children;
}
