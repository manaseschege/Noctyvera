import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Col, Row, Table, Tag } from 'antd';
import { ClockCircleOutlined, UnlockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { billingApi } from '../../api';
import { formatDisplay } from '../../api/currency';
import { useI18n } from '../../i18n/useT';
import { useAuth } from '../../store/auth';
import CheckoutModal from '../../components/CheckoutModal';
import { Blank, PageHeader, StatCard } from '../../components/ui';

const STATUS_COLOR = { COMPLETED: 'green', PENDING: 'gold', FAILED: 'red', CANCELLED: 'default' };

export default function MyBilling() {
  const { t, lang } = useI18n();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { entitlements, loadEntitlements } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const h = await billingApi.purchases();
      setHistory(Array.isArray(h) ? h : h?.content ?? []);
      await loadEntitlements();
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [message, loadEntitlements]);

  useEffect(() => {
    load();
  }, [load]);

  const ownedCount = entitlements?.unlockedItems ?? 0;
  const pending = history.filter((p) => p.status === 'PENDING');

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 72 }}>
      <PageHeader
        title={t('billing.title')}
        subtitle={t('billing.subtitle')}
        extra={<Button type="primary" icon={<UnlockOutlined />} onClick={() => setCheckout(true)}>{t('billing.getSubscription')}</Button>}
      />

      {pending.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginBottom: 22 }}
          message={t('billing.pendingTitle', { count: pending.length })}
          description={t('billing.pendingBody')}
        />
      )}

      <Row gutter={[18, 18]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <div className="stat-card">
            <div className="stat-label">{t('billing.subscription')}</div>
            <div className="stat-value" style={{ color: entitlements?.onTrial ? 'var(--success)' : 'var(--text-muted)', fontSize: 26 }}>
              {entitlements?.onTrial ? t('trial.active') : t('billing.payPerItem')}
            </div>
            {entitlements?.onTrial && entitlements.trialEndsAt && (
              <div className="stat-delta faint" style={{ fontWeight: 400 }}>
                {t('billing.renews', { date: dayjs(entitlements.subscriptionExpiresAt).format('D MMM YYYY') })}
              </div>
            )}
            {!entitlements?.onTrial && (
              <Button size="small" type="primary" style={{ marginTop: 12 }} onClick={() => setCheckout(true)}>
                {t('billing.subscribe')}
              </Button>
            )}
          </div>
        </Col>
        <Col xs={12} sm={8}>
          <StatCard label={t('billing.profilesUnlocked')} value={ownedCount} accent={ownedCount ? 'var(--gold-bright)' : undefined} />
        </Col>
        <Col xs={12} sm={8}>
          <StatCard label={t('billing.paymentsMade')} value={history.filter((p) => p.status === 'COMPLETED').length} />
        </Col>
      </Row>

      <Row gutter={[18, 18]}>
        {/* Plans */}
        <Col xs={24} lg={10}>
          <div className="glass" style={{ padding: 22, height: '100%' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{t('billing.plans')}</h3>
            <p className="faint" style={{ fontSize: 12.5, margin: '0 0 18px' }}>
              {t('billing.plansSub')}
            </p>

            <div className="kv-row">
              <span className="k">{t('billing.everyVideo')}</span>
              <span className="v">{t('billing.setByCreator')}</span>
            </div>
            <div className="kv-row">
              <span className="k">{t('billing.everyBroadcast')}</span>
              <span className="v">{t('billing.setByCreator')}</span>
            </div>
            <div className="kv-row">
              <span className="k">{t('billing.privateCalls')}</span>
              <span className="v">{t('billing.byDuration')}</span>
            </div>

            <Button block style={{ marginTop: 18 }} onClick={() => navigate('/discover')}>
              {t('nav.browseMembers')}
            </Button>
          </div>
        </Col>

        {/* Unlocked members */}
        <Col xs={24} lg={14}>
          <div className="glass" style={{ padding: 22, height: '100%' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>{t('billing.unlockedTitle')}</h3>
            {ownedCount === 0 ? (
              <Blank
                title={t('billing.nothingUnlocked')}
                description={t('billing.nothingUnlockedBody')}
                action={<Button type="primary" onClick={() => navigate('/discover')}>{t('nav.browseMembers')}</Button>}
                style={{ padding: '26px 12px' }}
              />
            ) : (
              <div className="owned-summary">
                <div className="owned-count">{ownedCount}</div>
                <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                  {t('billing.ownedBody')}
                </div>
                <Button style={{ marginTop: 14 }} onClick={() => navigate('/discover')}>
                  {t('nav.browseMembers')}
                </Button>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* History */}
      <div className="glass" style={{ padding: 22, marginTop: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>{t('billing.history')}</h3>
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={history}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 640 }}
          locale={{ emptyText: t('billing.noPayments') }}
          columns={[
            {
              title: t('billing.what'),
              dataIndex: 'type',
              width: 160,
              render: (type, r) => (
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t(`enums.purchaseType.${type}`)}</div>
                  {r.planCode && <div className="faint" style={{ fontSize: 11.5 }}>{r.planCode}</div>}
                </div>
              ),
            },
            {
              title: t('billing.provider'),
              dataIndex: 'provider',
              width: 120,
              responsive: ['md'],
              render: (p) => <span className="faint" style={{ fontSize: 12.5 }}>{p ?? '—'}</span>,
            },
            {
              title: t('billing.date'),
              dataIndex: 'createdAt',
              width: 160,
              sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
              defaultSortOrder: 'descend',
              render: (d) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{dayjs(d).format('D MMM YYYY, HH:mm')}</span>,
            },
            {
              title: t('billing.status'),
              dataIndex: 'status',
              width: 120,
              render: (s, r) => (
                <div>
                  <Tag color={STATUS_COLOR[s]}>{t(`enums.purchase.${s}`)}</Tag>
                  {r.failureReason && <div style={{ fontSize: 11, color: 'var(--danger)' }}>{r.failureReason}</div>}
                </div>
              ),
            },
            {
              title: t('billing.amount'),
              dataIndex: 'priceDisplay',
              width: 120,
              align: 'right',
              render: (v, r) => (
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatDisplay(v, r.currency, lang)}
                </span>
              ),
            },
          ]}
        />
      </div>

      <CheckoutModal open={checkout} onClose={() => setCheckout(false)} onSettled={load} />
    </div>
  );
}
