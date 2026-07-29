import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Avatar, Button, Drawer, Dropdown, Space, Tag } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuOutlined,
  PictureOutlined,
  SettingOutlined,
  UnlockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Brand from '../Brand';
import { BRAND } from '../../brand';
import LanguageToggle from '../LanguageToggle';
import { useT } from '../../i18n/useT';
import { VERIFICATION_COLOR, VERIFICATION_LABEL, canPost, isStaff, useAuth } from '../../store/auth';

export default function PublicLayout() {
  const t = useT();
  const { user, entitlements, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = user
    ? [
        { to: '/discover', label: t('nav.discover') },
        { to: '/live', label: t('nav.live') },
      ]
    : [
        { to: '/discover', label: t('nav.discover') },
        { to: '/live', label: t('nav.live') },
        { to: '/how-it-works', label: t('nav.howItWorks') },
      ];

  const menuItems = user
    ? [
        {
          key: 'header',
          label: (
            <div style={{ padding: '6px 4px', minWidth: 200 }}>
              <div style={{ fontWeight: 600 }}>@{user.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
              <Space size={4} style={{ marginTop: 8 }}>
                <Tag color={VERIFICATION_COLOR[user.verificationStatus]} style={{ marginInlineEnd: 0 }}>
                  {VERIFICATION_LABEL[user.verificationStatus]}
                </Tag>
                {entitlements?.subscribed && <Tag color="gold" style={{ marginInlineEnd: 0 }}>Subscribed</Tag>}
              </Space>
            </div>
          ),
          disabled: true,
        },
        { type: 'divider' },
        ...(canPost(user)
          ? [
              { key: '/studio', icon: <AppstoreOutlined />, label: t('nav.myDashboard') },
              { key: '/me/media', icon: <PictureOutlined />, label: t('nav.myPhotos') },
            ]
          : [{ key: '/onboarding/verify', icon: <PictureOutlined />, label: t('nav.verifyToPost') }]),
        { key: '/me/billing', icon: <UnlockOutlined />, label: t('nav.accessPayments') },
        { key: '/me/account', icon: <SettingOutlined />, label: t('nav.account') },
        ...(isStaff(user) ? [{ type: 'divider' }, { key: '/admin', icon: <DashboardOutlined />, label: t('nav.staffConsole') }] : []),
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: t('common.signOut'), danger: true },
      ]
    : [];

  const onMenu = async ({ key }) => {
    if (key === 'logout') {
      await logout();
      navigate('/');
      return;
    }
    navigate(key);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="shell site-header-inner">
          <Brand to={user ? '/studio' : '/'} />

          <nav className="nav-links desktop-only" style={{ flex: 1 }}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div style={{ flex: 1 }} className="mobile-only" />

          <Space size={10}>
            <LanguageToggle />
            {user && !entitlements?.subscribed && (
              <Button
                type="text"
                icon={<UnlockOutlined />}
                onClick={() => navigate('/me/billing')}
                style={{ color: 'var(--gold-bright)', fontWeight: 600 }}
                className="desktop-only"
              >
                {t('nav.getAccess')}
              </Button>
            )}

            {user ? (
              <Dropdown menu={{ items: menuItems, onClick: onMenu }} placement="bottomRight" trigger={['click']}>
                <Avatar icon={<UserOutlined />} className="clickable" style={{ border: '1px solid var(--line)' }}>
                  {user.username?.[0]?.toUpperCase()}
                </Avatar>
              </Dropdown>
            ) : (
              <>
                <Button type="text" onClick={() => navigate('/login')} style={{ color: 'var(--text-muted)' }}>
                  {t('common.signIn')}
                </Button>
                <Button type="primary" onClick={() => navigate('/join')}>
                  {t('common.join')}
                </Button>
              </>
            )}

            <Button className="mobile-only" type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} />
          </Space>
        </div>
      </header>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t('nav.menu')} placement="right" width={280}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          {nav.map((n) => (
            <Button
              key={n.to}
              type="text"
              block
              style={{ textAlign: 'left' }}
              onClick={() => {
                setDrawer(false);
                navigate(n.to);
              }}
            >
              {n.label}
            </Button>
          ))}
          {user && (
            <Button
              type="text"
              block
              style={{ textAlign: 'left' }}
              onClick={() => {
                setDrawer(false);
                navigate('/me/billing');
              }}
            >
              {t('nav.accessPayments')}
            </Button>
          )}
        </Space>
      </Drawer>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="shell">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 320 }}>
              <Brand />
              <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 14 }}>
                A members-only platform. Every account passes an identity check before it can
                publish anything.
              </p>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Explore</div>
              <div className="footer-links" style={{ flexDirection: 'column', gap: 9 }}>
                <Link to="/discover">{t('nav.discover')}</Link>
                <Link to="/live">{t('nav.live')}</Link>
                <Link to="/how-it-works">{t('nav.howItWorks')}</Link>
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Legal</div>
              <div className="footer-links" style={{ flexDirection: 'column', gap: 9 }}>
                <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
                <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
                <a href="#support" onClick={(e) => e.preventDefault()}>Support</a>
              </div>
            </div>
          </div>
          <hr className="hairline" style={{ margin: '34px 0 20px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontSize: 12.5 }}>
            <span className="faint">© {new Date().getFullYear()} {BRAND.name}. 18+ only.</span>
            <span className="faint">Identity-verified members, human moderation.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
