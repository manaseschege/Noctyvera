import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Spin, Tag } from 'antd';
import {
  CheckCircleFilled,
  MobileOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { billingApi } from '../../api';
import { ACTIVATION } from '../../api/config';
import { humanDuration } from '../../api/billing';
import { formatDisplay } from '../../api/currency';
import { useAuth } from '../../store/auth';
import OnboardingShell from './OnboardingShell';
import { useI18n } from '../../i18n/useT';

/**
 * The paid gate between identity approval and the app.
 *
 * Checkout is asynchronous — the POST returns a pending purchase and the
 * money lands out of band — so this screen starts the charge and then polls
 * until it settles rather than assuming success.
 */
export default function Activate() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user, entitlements, loadEntitlements } = useAuth();

  const [plans, setPlans] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [failed, setFailed] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    billingApi.plans().then(setPlans).catch((e) => message.error(e.message));
  }, [message]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // If a payment settles in another tab, don't strand them here.
  useEffect(() => {
    const t = setInterval(() => loadEntitlements(), 15000);
    return () => clearInterval(t);
  }, [loadEntitlements]);

  useEffect(() => {
    if (entitlements?.subscribed) navigate('/studio', { replace: true });
  }, [entitlements, navigate]);

  const plan = plans?.subscriptions?.find((p) => p.code === ACTIVATION.planCode) ?? plans?.subscriptions?.[0];

  const pay = useCallback(async () => {
    if (!plan) return;
    setBusy(true);
    setFailed(null);
    try {
      const res = await billingApi.subscribe(plan.code);
      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const settled = await billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });

      if (settled?.status === 'COMPLETED') {
        await loadEntitlements();
        message.success(t('onboarding.activateSuccess'));
        navigate('/studio', { replace: true });
      } else if (settled?.status === 'FAILED' || settled?.status === 'CANCELLED') {
        setFailed(settled.failureReason || t('onboarding.activateFailedBody'));
      } else {
        setFailed(t('onboarding.activateNotSeen'));
      }
    } catch (e) {
      setFailed(e.message);
    } finally {
      setBusy(false);
      setCheckout(null);
    }
  }, [plan, loadEntitlements, message, navigate, t]);

  /* ── Waiting on an out-of-band payment ── */
  if (busy && checkout) {
    return (
      <OnboardingShell width={560}>
        <div className="glass" style={{ padding: 40, textAlign: 'center' }}>
          <Spin size="large" />
          <h1 className="serif" style={{ fontSize: 28, margin: '24px 0 10px' }}>
            {checkout.action === 'PROMPT_ON_PHONE' ? 'Check your phone' : 'Waiting for confirmation'}
          </h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
            {checkout.instructions ||
              (checkout.action === 'PROMPT_ON_PHONE'
                ? t('onboarding.checkPhoneBody')
                : t('onboarding.waitingBody'))}
          </p>
          <Tag color="gold" style={{ marginTop: 20 }}>
            {formatDisplay(checkout.purchase?.priceDisplay, checkout.purchase?.currency, lang)} · {t('enums.purchase.PENDING').toLowerCase()}
          </Tag>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell width={620}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <CheckCircleFilled style={{ fontSize: 40, color: 'var(--success)' }} />
        <h1 className="serif" style={{ fontSize: 32, margin: '18px 0 10px' }}>{t('onboarding.activateVerified')}</h1>
        <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 440, margin: '0 auto' }}>
          {t('onboarding.activateSub', { username: user?.username ?? '' })}
        </p>
      </div>

      {failed && <Alert type="error" showIcon message={t('onboarding.activateFailed')} description={failed} style={{ marginBottom: 20 }} />}

      <div className="glass" style={{ padding: 28 }}>
        {!plans ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : !plan ? (
          <Alert type="warning" showIcon message={t('onboarding.noPlan')} description={t('onboarding.noPlanBody')} />
        ) : (
          <>
            <div className="eyebrow">{t('onboarding.activation')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '12px 0 4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em' }}>
                {formatDisplay(plan.priceDisplay, plans.currency, lang)}
              </span>
              <span className="muted" style={{ fontSize: 15 }}>· {humanDuration(plan.duration)}</span>
            </div>
            <p className="faint" style={{ fontSize: 12.5, margin: '0 0 20px' }}>
              {t('onboarding.activateNoAuto')}
            </p>

            <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 18 }}>
              {[
                t('onboarding.activatePerk1'),
                t('onboarding.activatePerk2'),
                t('onboarding.activatePerk3'),
              ].map((li) => (
                <div key={li} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 0', fontSize: 13.5 }}>
                  <CheckCircleFilled style={{ color: 'var(--gold)', fontSize: 13 }} />
                  <span className="muted">{li}</span>
                </div>
              ))}
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={busy}
              onClick={pay}
              icon={<ThunderboltFilled />}
              style={{ marginTop: 22, height: 48 }}
            >
              {t('onboarding.activatePay', { price: formatDisplay(plan.priceDisplay, plans.currency, lang) })}
            </Button>

            <div className="faint" style={{ fontSize: 12, marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <MobileOutlined style={{ marginTop: 2 }} />
              <span>{t('onboarding.activatePhone')}</span>
            </div>
          </>
        )}
      </div>

      <Alert
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginTop: 20 }}
        message={t('onboarding.alreadyPaid')}
        description={
          <span>
            {t('onboarding.alreadyPaidBody')}{' '}
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => loadEntitlements()}>
              {t('common.checkNow')}
            </Button>
            {entitlements?.subscriptionExpiresAt && (
              <> · current access runs to {dayjs(entitlements.subscriptionExpiresAt).format('D MMM YYYY')}</>
            )}
          </span>
        }
      />
    </OnboardingShell>
  );
}
