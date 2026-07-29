import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Drawer, Dropdown, Grid, Layout, Menu, Space, Tag, Tooltip } from 'antd';
import {
  BellOutlined,
  GlobalOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Brand from '../Brand';
import { useAuth } from '../../store/auth';
import LanguageToggle from '../LanguageToggle';
import { useT } from '../../i18n/useT';

const { Sider, Content } = Layout;

/**
 * Shared chrome for the creator studio and the admin console.
 * `nav` is an antd Menu items array whose keys are absolute routes.
 */
export default function DashboardLayout({ nav, badge, accent, notifications = 0 }) {
  const t = useT();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const isMobile = !screens.lg;

  // Longest matching key wins so nested routes highlight their parent item.
  const flatKeys = nav.flatMap((g) => (g.children ? g.children.map((c) => c.key) : [g.key])).filter(Boolean);
  const selected =
    flatKeys
      .filter((k) => location.pathname === k || location.pathname.startsWith(`${k}/`))
      .sort((a, b) => b.length - a.length)[0] ?? location.pathname;

  const go = ({ key }) => {
    navigate(key);
    setDrawer(false);
  };

  const menu = (
    <Menu
      mode="inline"
      theme="dark"
      items={nav}
      selectedKeys={[selected]}
      defaultOpenKeys={nav.filter((g) => g.children).map((g) => g.key)}
      onClick={go}
      style={{ background: 'transparent', borderInlineEnd: 0, flex: 1, paddingTop: 8 }}
    />
  );

  const sidebarInner = (
    <>
      <div style={{ padding: '18px 20px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Brand to="/" compact={collapsed && !isMobile} />
        {(!collapsed || isMobile) && (
          <Tag color="gold" style={{ marginLeft: 'auto', marginInlineEnd: 0 }}>
            {accent}
          </Tag>
        )}
      </div>
      <hr className="hairline" />
      {menu}
      {(!collapsed || isMobile) && (
        <div style={{ padding: 16 }}>
          <div
            className="glass"
            style={{ padding: 14, borderRadius: 14, display: 'flex', gap: 10, alignItems: 'center' }}
          >
            <Avatar src={user?.avatar || undefined} icon={<UserOutlined />} size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t(`enums.role.${user?.role}`)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {!isMobile && (
        <Sider
          className="dash-sider"
          width={252}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          collapsedWidth={78}
          theme="dark"
        >
          {sidebarInner}
        </Sider>
      )}

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        placement="left"
        width={262}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' }, header: { display: 'none' } }}
      >
        {sidebarInner}
      </Drawer>

      <Layout style={{ background: 'transparent' }}>
        <div className="dash-header">
          <Space size={12}>
            {isMobile && <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} />}
            {badge}
          </Space>

          <Space size={8}>
            <LanguageToggle />
            <Tooltip title={t('nav.publicSite')}>
              <Button type="text" icon={<GlobalOutlined />} onClick={() => navigate('/')} />
            </Tooltip>
            <Badge count={notifications} size="small" color="var(--gold)">
              <Button type="text" icon={<BellOutlined />} />
            </Badge>
            <Dropdown
              placement="bottomRight"
              trigger={['click']}
              menu={{
                items: [
                  { key: '/account', icon: <SettingOutlined />, label: t('nav.account') },
                  { key: 'site', icon: <GlobalOutlined />, label: t('nav.publicSite') },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: t('common.signOut'), danger: true },
                ],
                onClick: async ({ key }) => {
                  if (key === 'logout') {
                    await logout();
                    navigate('/');
                  } else if (key === 'site') navigate('/');
                  else navigate(key);
                },
              }}
            >
              <Avatar
                src={user?.avatar || undefined}
                icon={<UserOutlined />}
                size={32}
                className="clickable"
                style={{ border: '1px solid var(--line)' }}
              />
            </Dropdown>
          </Space>
        </div>

        <Content>
          <div className="dash-content">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
