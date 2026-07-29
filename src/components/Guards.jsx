import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { NEXT_STEP } from '../api/config';
import { canPost, homeFor, isStaff, needsActivation, onboardingComplete, useAuth } from '../store/auth';
import { useT } from '../i18n/useT';

/** Held while the first /me is in flight, so a reload doesn't bounce. */
function Booting() {
  return (
    <div className="center-page">
      <Spin size="large" />
    </div>
  );
}

/** Requires a session. `staff` restricts to MODERATOR/ADMIN. */
export function RequireAuth({ staff = false }) {
  const t = useT();
  const { user, entitlements, booting } = useAuth();
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
            <Button type="primary" href={homeFor(user, entitlements)}>
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
 * The app proper. A member who hasn't finished onboarding is sent to
 * whichever step the server says they're on.
 */
export function RequireOnboarded() {
  const { user, entitlements, entitlementsLoaded, booting } = useAuth();
  const location = useLocation();

  if (booting) return <Booting />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isStaff(user)) return <Outlet />;
  if (!onboardingComplete(user)) return <Navigate to={homeFor(user, entitlements)} replace />;
  // Don't decide on activation until entitlements are actually known.
  if (!entitlementsLoaded) return <Booting />;
  if (needsActivation(user, entitlements)) return <Navigate to="/onboarding/activate" replace />;
  return <Outlet />;
}

/** Posting media requires an approved identity check. */
export function RequireVerified() {
  const { user, entitlements, entitlementsLoaded, booting } = useAuth();

  if (booting) return <Booting />;
  if (!user) return <Navigate to="/login" replace />;
  if (!canPost(user)) return <Navigate to={homeFor(user, entitlements)} replace />;
  if (!entitlementsLoaded) return <Booting />;
  if (needsActivation(user, entitlements)) return <Navigate to="/onboarding/activate" replace />;
  return <Outlet />;
}

/**
 * The onboarding funnel itself. Signed in but not yet finished — and
 * once finished, these screens are no longer reachable.
 */
export function RequireOnboarding() {
  const { user, entitlements, entitlementsLoaded, booting } = useAuth();

  if (booting) return <Booting />;
  if (!user) return <Navigate to="/login" replace />;
  if (isStaff(user)) return <Navigate to="/admin" replace />;
  // Finished AND paid — nothing left in the funnel.
  if (user.nextStep === NEXT_STEP.DONE) {
    if (!entitlementsLoaded) return <Booting />;
    if (!needsActivation(user, entitlements)) return <Navigate to="/studio" replace />;
  }
  return <Outlet />;
}

/** Keeps an authenticated user off the login/register screens. */
export function RedirectIfAuthed({ children }) {
  const { user, entitlements, booting } = useAuth();
  if (booting) return <Booting />;
  if (user) return <Navigate to={homeFor(user, entitlements)} replace />;
  return children;
}
