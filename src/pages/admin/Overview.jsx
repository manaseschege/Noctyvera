import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Row, Skeleton } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  DollarOutlined,
  IdcardOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../api';
import { isAdmin, useAuth } from '../../store/auth';
import { PageHeader } from '../../components/ui';
import { useT } from '../../i18n/useT';

const countOf = (v) => (typeof v === 'number' ? v : v?.count ?? 0);

/**
 * Staff landing page. Three queues, each with its count and a single way
 * in — so whoever is on shift can see what needs doing without opening
 * anything first.
 */
export default function Overview() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [counts, setCounts] = useState(null);

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

  if (!counts) return <Skeleton active paragraph={{ rows: 6 }} />;

  const queues = [
    {
      key: 'kyc',
      icon: <IdcardOutlined />,
      title: t('admin.kycTitle'),
      body: t('admin.kycBody'),
      count: counts.kyc,
      to: '/admin/kyc',
    },
    {
      key: 'media',
      icon: <PictureOutlined />,
      title: t('admin.mediaTitle'),
      body: t('admin.mediaBody'),
      count: counts.media,
      to: '/admin/media',
    },
    ...(isAdmin(user)
      ? [
          {
            key: 'payments',
            icon: <DollarOutlined />,
            title: t('admin.paymentsTitle'),
            body: t('admin.paymentsBody'),
            count: counts.payments,
            to: '/admin/payments',
          },
        ]
      : []),
  ];

  const total = queues.reduce((s, q) => s + q.count, 0);

  return (
    <>
      <PageHeader
        title={t('admin.today')}
        subtitle={
          total === 0
            ? t('admin.allClear')
            : t('admin.waiting', { count: total, queues: queues.filter((q) => q.count > 0).length })
        }
      />

      {total === 0 && (
        <div
          className="glass"
          style={{ padding: 34, textAlign: 'center', marginBottom: 24, borderColor: 'rgba(79,209,139,0.3)' }}
        >
          <CheckCircleFilled style={{ fontSize: 32, color: 'var(--success)' }} />
          <h2 className="serif" style={{ fontSize: 26, margin: '14px 0 8px' }}>{t('admin.allCaughtUp')}</h2>
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            {t('admin.allCaughtUpBody')}
          </p>
        </div>
      )}

      <Row gutter={[18, 18]}>
        {queues.map((q) => {
          const busy = q.count > 0;
          return (
            <Col xs={24} md={12} xl={8} key={q.key}>
              <button
                type="button"
                onClick={() => navigate(q.to)}
                className="glass"
                style={{
                  width: '100%',
                  height: '100%',
                  padding: 24,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  font: 'inherit',
                  borderColor: busy ? 'rgba(217,180,106,0.4)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      background: busy ? 'var(--gold-wash)' : 'rgba(255,255,255,0.04)',
                      color: busy ? 'var(--gold-bright)' : 'var(--text-muted)',
                      fontSize: 19,
                    }}
                  >
                    {q.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 34,
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      color: busy ? 'var(--gold-bright)' : 'var(--text-faint)',
                    }}
                  >
                    {q.count}
                  </span>
                </div>

                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 18 }}>{q.title}</div>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.65, margin: '6px 0 16px' }}>
                  {q.body}
                </p>

                <span style={{ color: busy ? 'var(--gold)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
                  {busy ? t('admin.startReviewing') : t('admin.openQueue')} <ArrowRightOutlined />
                </span>
              </button>
            </Col>
          );
        })}
      </Row>

      <div style={{ marginTop: 24 }}>
        <Button onClick={load}>{t('admin.refreshCounts')}</Button>
      </div>
    </>
  );
}
