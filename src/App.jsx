import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  RedirectIfAuthed,
  RequireAuth,
  RequireOnboarded,
  RequireOnboarding,
  RequireVerified,
} from './components/Guards';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './pages/admin/AdminLayout';

import Landing from './pages/public/Landing';
import HowItWorks from './pages/public/HowItWorks';
import NotFound from './pages/public/NotFound';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import CreateProfile from './pages/onboarding/CreateProfile';
import Verify from './pages/onboarding/Verify';
import OnboardingStatus from './pages/onboarding/Status';
import Activate from './pages/onboarding/Activate';

import Discover from './pages/app/Discover';
import MemberProfile from './pages/app/MemberProfile';
import LiveDirectory from './pages/app/LiveDirectory';
import LiveRoom from './pages/app/LiveRoom';

import StudioLayout from './pages/me/StudioLayout';
import Studio from './pages/me/Studio';
import MyMedia from './pages/me/MyMedia';
import MyLive from './pages/me/MyLive';
import MyBilling from './pages/me/MyBilling';
import MyAccount from './pages/me/MyAccount';

import Overview from './pages/admin/Overview';
import KycQueue from './pages/admin/KycQueue';
import MediaQueue from './pages/admin/MediaQueue';
import Payments from './pages/admin/Payments';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ── Auth ── */}
        <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
        <Route path="/join" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />

        {/* ── Onboarding funnel — order is driven by /me.nextStep ── */}
        <Route element={<RequireOnboarding />}>
          <Route path="/onboarding/profile" element={<CreateProfile />} />
          <Route path="/onboarding/verify" element={<Verify />} />
          <Route path="/onboarding/status" element={<OnboardingStatus />} />
          <Route path="/onboarding/activate" element={<Activate />} />
        </Route>

        {/* ── Site ── */}
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="how-it-works" element={<HowItWorks />} />

          {/* Public shop window — anonymous visitors browse members, see the
              free previews and enough profile detail to decide to buy. Each
              page degrades to an AccessGate if the API refuses. */}
          <Route path="discover" element={<Discover />} />
          <Route path="m/:userId" element={<MemberProfile />} />
          <Route path="live" element={<LiveDirectory />} />
          <Route path="live/:sessionId" element={<LiveRoom />} />

          {/* Signed-in members */}
          <Route element={<RequireOnboarded />}>
            {/* The studio is the one dashboard — keep the old path working. */}
            <Route path="home" element={<Navigate to="/studio" replace />} />
            <Route path="me/billing" element={<MyBilling />} />
            <Route path="me/account" element={<MyAccount />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ── Member dashboard — persistent sidebar, verified members only ── */}
        <Route element={<RequireVerified />}>
          <Route path="/studio" element={<StudioLayout />}>
            <Route index element={<Studio />} />
            <Route path="media" element={<MyMedia />} />
            <Route path="live" element={<MyLive />} />
            <Route path="billing" element={<MyBilling />} />
            <Route path="account" element={<MyAccount />} />
            <Route path="*" element={<Navigate to="/studio" replace />} />
          </Route>
        </Route>

        {/* Old paths kept working */}
        <Route path="/me/media" element={<Navigate to="/studio/media" replace />} />
        <Route path="/me/live" element={<Navigate to="/studio/live" replace />} />

        {/* ── Staff console ── */}
        <Route element={<RequireAuth staff />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="kyc" element={<KycQueue />} />
            <Route path="media" element={<MediaQueue />} />
            <Route path="payments" element={<Payments />} />
            <Route path="*" element={<Navigate to="/admin/kyc" replace />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
