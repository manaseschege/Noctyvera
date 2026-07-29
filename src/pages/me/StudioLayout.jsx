import { Tag } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  PictureOutlined,
  SettingOutlined,
  UnlockOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../store/auth';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useT } from '../../i18n/useT';

/**
 * Creator workspace chrome — the same persistent sidebar the staff console
 * uses, so a creator can move between their content, rooms, billing and
 * account without going back through the avatar menu every time.
 */
export default function StudioLayout() {
  const t = useT();
  const { user, entitlements } = useAuth();

  const nav = [
    { key: '/studio', icon: <DashboardOutlined />, label: t('nav.myDashboard') },
    { key: '/studio/media', icon: <PictureOutlined />, label: t('nav.myPhotos') },
    { key: '/studio/live', icon: <VideoCameraOutlined />, label: t('nav.myLiveRooms') },
    { key: '/studio/billing', icon: <UnlockOutlined />, label: t('nav.accessPayments') },
    { key: '/studio/account', icon: <SettingOutlined />, label: t('nav.account') },
    { key: '/discover', icon: <AppstoreOutlined />, label: t('nav.browseMembers') },
  ];

  return (
    <DashboardLayout
      nav={nav}
      accent="Dashboard"
      badge={
        <span className="muted" style={{ fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
          @{user?.username}
          {entitlements?.subscribed && <Tag color="gold" style={{ marginInlineEnd: 0 }}>{t('common.subscribed')}</Tag>}
        </span>
      }
    />
  );
}
