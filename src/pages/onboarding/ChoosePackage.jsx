import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Spin, Tag } from 'antd';
import { CheckCircleFilled, MobileOutlined, ThunderboltFilled } from '@ant-design/icons';
import { billingApi } from '../../api';
import { formatDisplay } from '../../api/currency';
import PackagePicker from '../../components/PackagePicker';
import { useAuth } from '../../store/auth';
import OnboardingShell from './OnboardingShell';
import { useI18n } from '../../i18n/useT';

/**
 * The last step of creator onboarding: buying the right to publish.
 *
 * This replaced a blanket monthly subscription that every account — viewers
 * included — had to buy before the app would open at all. That charged
 * somebody who came to see one creator the price of the whole platform, and
 * it charged creators for the privilege of being sold. Now only creators pay
 * the platform, and only for what they intend to post.
 *
 * Checkout is asynchronous: the POST returns a pending purchase and the money
 * lands out of band, so this polls until it settles rather than assuming.
 */
export default function ChoosePackage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user, packageStatus, loadPackage } = useAuth();

  const [packages, setPackages] = useState(null);
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [failed, setFailed] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    billingApi
      .creatorPackages()
      .then((list) => {
        setPackages(list);
        // Gold first: it is the one most creators want, and preselecting
        // nothing means the primary button starts disabled for no reason.
        setChoice((current) => current ?? list.find((p) => p.code === 'GOLD')?.code ?? list[0]?.code);
      })
      .catch((e) => message.error(e.message));
  }, [message]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // If a payment settles in another tab, don't strand them here.
  useEffect(() => {
    const id = setInterval(() => loadPackage(), 15000);
    return () => clearInterval(id);
  }, [loadPackage]);

  useEffect(() => {
    if (packageStatus?.active) navigate('/studio', { replace: true });
  }, [packageStatus, navigate]);

  const selected = packages?.find((p) => p.code === choice);

  const pay = useCallback(async () => {
    if (!choice) return;
    setBusy(true);
    setFailed(null);
    try {
      const res = await billingApi.buyCreatorPackage(choice);
      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      // Settled on the spot? Skip the waiting screen entirely.
      let settled = billingApi.isSettled(res) ? res.purchase : null;
      if (!settled) {
        const controller = new AbortController();
        abortRef.current = controller;
        settled = await billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });
      }

      if (settled?.status === 'COMPLETED') {
        await loadPackage();
        message.success(t('packages.activated'));
        navigate('/studio', { replace: true });
      } else if (settled?.status === 'FAILED' || settled?.status === 'CANCELLED') {
        setFailed(settled.failureReason || t('packages.failedBody'));
      } else {
        setFailed(t('packages.notSeen'));
      }
    } catch (e) {
      setFailed(e.message);
    } finally {
      setBusy(false);
      setCheckout(null);
    }
  }, [choice, loadPackage, message, navigate, t]);

  /* ── Waiting on an out-of-band payment ── */
  if (busy && checkout) {
    return (
      <OnboardingShell width={560}>
        <div className="glass" style={{ padding: 40, textAlign: 'center' }}>
          <Spin size="large" />
          <h1 className="serif" style={{ fontSize: 28, margin: '24px 0 10px' }}>
            {checkout.action === 'PROMPT_ON_PHONE' ? t('billing.checkPhone') : t('billing.waiting')}
          </h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
            {checkout.instructions ||
              (checkout.action === 'PROMPT_ON_PHONE'
                ? t('onboarding.checkPhoneBody')
                : t('onboarding.waitingBody'))}
          </p>
          <Tag color="gold" style={{ marginTop: 20 }}>
            {formatDisplay(checkout.purchase?.priceDisplay, checkout.purchase?.currency, lang)} ·{' '}
            {t('enums.purchase.PENDING').toLowerCase()}
          </Tag>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell width={840}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <CheckCircleFilled style={{ fontSize: 40, color: 'var(--success)' }} />
        <h1 className="serif" style={{ fontSize: 32, margin: '18px 0 10px' }}>{t('packages.verifiedTitle')}</h1>
        <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
          {t('packages.verifiedSub', { username: user?.username ?? '' })}
        </p>
      </div>

      {failed && (
        <Alert type="error" showIcon message={t('packages.failed')} description={failed} style={{ marginBottom: 20 }} />
      )}

      {!packages ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : !packages.length ? (
        <Alert type="warning" showIcon message={t('packages.none')} description={t('packages.noneBody')} />
      ) : (
        <>
          <PackagePicker
            packages={packages}
            value={choice}
            onChange={setChoice}
            currentCode={packageStatus?.code}
            disabled={busy}
          />

          <div className="glass" style={{ padding: 22, marginTop: 22 }}>
            <Button
              type="primary"
              size="large"
              block
              loading={busy}
              disabled={!selected}
              onClick={pay}
              icon={<ThunderboltFilled />}
              style={{ height: 48 }}
            >
              {selected
                ? t('packages.payFor', {
                    label: selected.label,
                    price: formatDisplay(selected.priceDisplay, selected.currency, lang),
                  })
                : t('packages.choose')}
            </Button>

            <div
              className="faint"
              style={{ fontSize: 12, marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}
            >
              <MobileOutlined style={{ marginTop: 2 }} />
              <span>{t('packages.phoneNote')}</span>
            </div>
          </div>

          <div className="faint" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 18, lineHeight: 1.7 }}>
            {t('packages.upgradeNote')}
          </div>
        </>
      )}
    </OnboardingShell>
  );
}
