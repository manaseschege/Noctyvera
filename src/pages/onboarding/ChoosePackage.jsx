import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, App, Button, Spin, Tag } from 'antd';
import { CheckCircleFilled, MobileOutlined, ThunderboltFilled } from '@ant-design/icons';
import { billingApi } from '../../api';
import { CREATOR_PACKAGES } from '../../api/config';
import { formatDisplay } from '../../api/currency';
import MomoNumberField from '../../components/MomoNumberField';
import PackagePicker from '../../components/PackagePicker';
import PaymentMethodPicker from '../../components/PaymentMethodPicker';
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
  const { user, packageStatus, loadPackage, entitlements } = useAuth();

  const [packages, setPackages] = useState(null);
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [failed, setFailed] = useState(null);
  const [msisdn, setMsisdn] = useState(billingApi.lastMsisdn);
  const [touched, setTouched] = useState(false);
  const [methods, setMethods] = useState([]);
  const [method, setMethod] = useState(null);
  const abortRef = useRef(null);

  // Per chosen method, not per deployment: paying by card must not demand a
  // handset just because mobile money is also on offer.
  const selectedMethod = methods.find((m) => m.code === method);
  const needsMsisdn = selectedMethod
    ? selectedMethod.requiresPayerMsisdn
    : billingApi.requiresPayerMsisdn(entitlements);

  useEffect(() => {
    billingApi
      .paymentMethods()
      .then((list) => {
        setMethods(list ?? []);
        setMethod((c) => c ?? list?.find((m) => m.isDefault)?.code ?? list?.[0]?.code ?? null);
      })
      // Losing the list is not a reason to block onboarding: leaving `method`
      // null makes the server fall back to its own default.
      .catch(() => setMethods([]));
  }, []);

  useEffect(() => {
    billingApi
      .creatorPackages()
      .then((list) => {
        setPackages(list);
        // Preselect the tier the picker flags as most popular, so the primary
        // button does not start disabled for no reason. Resolved from the same
        // map the badge uses rather than a hardcoded code, which is how this
        // came to be pointing at a package that no longer exists.
        const popular = list.find((p) => CREATOR_PACKAGES[p.code]?.best)?.code;
        setChoice((current) => current ?? popular ?? list[0]?.code);
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
    if (needsMsisdn && !billingApi.isValidMsisdn(msisdn)) {
      setTouched(true);
      setFailed(t('billing.momoRequired'));
      return;
    }

    setBusy(true);
    setFailed(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const number = needsMsisdn ? msisdn.trim() : undefined;
      const res = await billingApi.buyCreatorPackage(choice, {
        method: method ?? undefined,
        payerMsisdn: number,
      });
      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      // Settled on the spot? Skip the waiting screen entirely.
      let settled = billingApi.isSettled(res) ? res.purchase : null;
      if (!settled) {
        settled = await billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });
      }
      if (controller.signal.aborted) return;

      if (settled?.status === 'COMPLETED') {
        if (number) billingApi.rememberMsisdn(number);
        await loadPackage();
        message.success(t('packages.activated'));
        navigate('/studio', { replace: true });
      } else if (settled?.status === 'FAILED' || settled?.status === 'CANCELLED') {
        setFailed(settled.failureReason || t('packages.failedBody'));
      } else {
        // Still pending: the prompt is live on the handset. The 15s poll above
        // is already watching for it, so this waits rather than declaring
        // failure and tempting a second payment.
        setFailed(t('billing.stillWaitingBody'));
      }
    } catch (e) {
      setFailed(e.code === 'momo_unavailable' ? t('billing.momoUnavailable') : e.message);
    } finally {
      setBusy(false);
      setCheckout(null);
    }
  }, [choice, loadPackage, message, method, msisdn, navigate, needsMsisdn, t]);

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
            {checkout.action === 'PROMPT_ON_PHONE' && msisdn
              ? t('billing.checkPhoneBody', { msisdn: msisdn.trim() })
              : checkout.instructions ||
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
            <div style={{ marginTop: -18 }}>
              <PaymentMethodPicker
                methods={methods}
                value={method}
                onChange={setMethod}
                disabled={busy}
              />
            </div>

            {needsMsisdn && (
              <div style={{ marginBottom: 18 }}>
                <MomoNumberField
                  value={msisdn}
                  onChange={setMsisdn}
                  touched={touched}
                  disabled={busy}
                />
              </div>
            )}

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
