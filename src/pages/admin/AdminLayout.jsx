import { useCallback, useEffect, useState } from 'react';
import { Tag } from 'antd';
import { DollarOutlined, IdcardOutlined, PictureOutlined } from '@ant-design/icons';
import { adminApi } from '../../api';
import { isAdmin, useAuth } from '../../store/auth';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useT } from '../../i18n/useT';

const countOf = (v) => (typeof v === 'number' ? v : v?.count ?? 0);

export default function AdminLayout() {
  const t = useT();
  const { user } = useAuth();
  const [counts, setCounts] = useState({ kyc: 0, media: 0, payments: 0 });

  const load = useCallback(async () => {
    const [kyc, media, payments] = await Promise.all([
      adminApi.kycQueueCount().catch(() => 0),
      adminApi.takenDownCount().catch(() => 0),
      isAdmin(user) ? adminApi.pendingPurchaseCount().catch(() => 0) : Promise.resolve(0),
    ]);
    setCounts({ kyc: countOf(kyc), media: countOf(media), payments: countOf(payments) });
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const badge = (n) =>
    n > 0 ? (
      <Tag color="gold" style={{ marginInlineEnd: 0 }}>
        {n}
      </Tag>
    ) : null;

  const label = (text, n) => (
    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      {text}
      {badge(n)}
    </span>
  );

  const nav = [
    { key: '/admin/kyc', icon: <IdcardOutlined />, label: label(t('admin.kycTitle'), counts.kyc) },
    { key: '/admin/media', icon: <PictureOutlined />, label: label(t('admin.mediaTitle'), counts.media) },
    ...(isAdmin(user)
      ? [{ key: '/admin/payments', icon: <DollarOutlined />, label: label(t('admin.paymentsTitle'), counts.payments) }]
      : []),
  ];

  const waiting = counts.kyc + counts.media + counts.payments;

  return (
    <DashboardLayout
      nav={nav}
      accent={isAdmin(user) ? 'Admin' : 'Mod'}
      notifications={waiting}
      badge={
        <span className="muted" style={{ fontSize: 13 }}>
          {waiting > 0 ? t('admin.itemsWaiting', { count: waiting }) : t('admin.allQueuesClear')}
        </span>
      }
    />
  );
}
