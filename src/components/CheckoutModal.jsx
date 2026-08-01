import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Modal, Radio, Result, Space, Spin, Tag } from 'antd';
import { LockFilled, MobileOutlined, ThunderboltFilled } from '@ant-design/icons';
import { billingApi } from '../api';
import { humanDuration } from '../api/billing';
import { useAuth } from '../store/auth';
import { formatDisplay } from '../api/currency';
import { useI18n } from '../i18n/useT';

/**
 * Buying access. Two products:
 *   · unlock  — one creator, everything she has posted, at her price
 *   · plan    — a subscription covering everyone
 *
 * The unlock is deliberately one line item and not a menu. Splitting it into
 * a photos tier and a videos tier was considered and dropped: a viewer picks
 * a person, not a media type, and every extra choice on a payment screen is
 * somewhere to hesitate.
 *
 * The price comes off the member's own card or profile
 * (`unlockPriceMinor` / `unlockPriceDisplay`), falling back to the platform
 * default from `/billing/plans` for a member object that predates it.
 *
 * Checkout is asynchronous. The POST returns a CheckoutResponse whose
 * `action` decides what happens next:
 *
 *   REDIRECT         send the browser to redirectUrl
 *   PROMPT_ON_PHONE  an STK push is on its way — wait and poll
 *   MANUAL           show instructions; an admin settles it by hand
 *
 * Either way the purchase lands PENDING, so we poll until it settles
 * rather than pretending the money already moved.
 */
export default function CheckoutModal({ open, onClose, member, onSettled }) {
  const { t, lang } = useI18n();
  const { message } = App.useApp();
  const { loadEntitlements } = useAuth();

  const [plans, setPlans] = useState(null);
  const [choice, setChoice] = useState('unlock');
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [settled, setSettled] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCheckout(null);
    setSettled(null);
    billingApi.plans().then(setPlans).catch((e) => message.error(e.message));
  }, [open, message]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const start = async () => {
    setBusy(true);
    try {
      const res =
        choice === 'unlock'
          ? await billingApi.unlockProfile(member.userId)
          : await billingApi.subscribe(choice);

      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      // Already paid — go straight to the result rather than opening a waiting
      // screen for something that is never going to change.
      const final = billingApi.isSettled(res)
        ? res.purchase
        : await (async () => {
            // PROMPT_ON_PHONE / MANUAL — settle out of band, so wait for it.
            const controller = new AbortController();
            abortRef.current = controller;
            return billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });
          })();

      setSettled(final);

      if (final?.status === 'COMPLETED') {
        await loadEntitlements();
        onSettled?.(final);
      }
    } catch (e) {
      message.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  const unlockOpt = plans?.profileUnlock;
  const currency = plans?.currency;
  const price = (d, c) => formatDisplay(d, c ?? currency, lang);

  // Hers if she has set one, the platform default otherwise.
  const unlockPrice = member?.unlockPriceDisplay ?? unlockOpt?.priceDisplay;
  const unlockCurrency = member?.currency ?? currency;

  /* ── Settled ── */
  if (settled) {
    const won = settled.status === 'COMPLETED';
    return (
      <Modal open={open} onCancel={close} footer={<Button type="primary" onClick={close}>{t('common.done')}</Button>} width={430} destroyOnHidden>
        <Result
          status={won ? 'success' : 'error'}
          title={won ? t('billing.paymentReceived') : t('billing.paymentFailed')}
          subTitle={
            won
              ? choice === 'unlock'
                ? t('billing.profileOpen', { username: member?.username ?? '' })
                : t('billing.subActive')
              : settled.failureReason || t('billing.noMoneyTaken')
          }
        />
      </Modal>
    );
  }

  /* ── Waiting on an out-of-band payment ── */
  if (checkout && busy) {
    return (
      <Modal open={open} onCancel={close} footer={<Button onClick={close}>{t('common.cancel')}</Button>} width={430} destroyOnHidden>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <h3 className="serif" style={{ fontSize: 22, margin: '22px 0 8px' }}>
            {checkout.action === 'PROMPT_ON_PHONE' ? t('billing.checkPhone') : t('billing.waiting')}
          </h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
            {checkout.instructions ||
              (checkout.action === 'PROMPT_ON_PHONE'
                ? t('onboarding.checkPhoneBody')
                : t('onboarding.waitingBody'))}
          </p>
          <Tag color="gold" style={{ marginTop: 18 }}>
            {price(checkout.purchase?.priceDisplay, checkout.purchase?.currency)} · {t('enums.purchase.PENDING').toLowerCase()}
          </Tag>
        </div>
      </Modal>
    );
  }

  /* ── Choosing ── */
  return (
    <Modal
      open={open}
      onCancel={close}
      width={470}
      destroyOnHidden
      title={
        <Space>
          <LockFilled style={{ color: 'var(--gold)' }} />
          {t('billing.checkoutTitle')}
        </Space>
      }
      footer={[
        <Button key="c" onClick={close}>
          {t('common.notNow')}
        </Button>,
        <Button key="ok" type="primary" loading={busy} onClick={start} icon={<ThunderboltFilled />} disabled={!plans}>
          {t('common.continue')}
        </Button>,
      ]}
    >
      {!plans ? (
        <div style={{ padding: '30px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : !plans.monetisationEnabled ? (
        <Alert type="info" showIcon message={t('billing.freeNow')} description={t('billing.freeNowBody')} />
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 0 }}>
            {t('billing.checkoutIntro')}
          </p>

          <Radio.Group value={choice} onChange={(e) => setChoice(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {member && unlockPrice && (
                <Radio value="unlock" style={optStyle(choice === 'unlock')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t('billing.unlockOne', { username: member.username })}</span>
                      <span className="faint" style={{ display: 'block', fontSize: 12, marginTop: 3 }}>
                        {t('billing.thisProfileOnly', { duration: humanDuration(unlockOpt?.duration) })}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {price(unlockPrice, unlockCurrency)}
                    </span>
                  </div>
                </Radio>
              )}

              {(plans.subscriptions ?? []).map((p) => (
                <Radio key={p.code} value={p.code} style={optStyle(choice === p.code)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.label}</span>
                      <span className="faint" style={{ display: 'block', fontSize: 12, marginTop: 3 }}>
                        {t('billing.everyoneOnSite', { duration: humanDuration(p.duration) })}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {price(p.priceDisplay)}
                    </span>
                  </div>
                </Radio>
              ))}
            </Space>
          </Radio.Group>

          <div className="faint" style={{ fontSize: 12, marginTop: 16, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <MobileOutlined style={{ marginTop: 2 }} />
            <span>{t('billing.phoneNote')}</span>
          </div>
        </>
      )}
    </Modal>
  );
}

const optStyle = (active) => ({
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--line)',
  borderRadius: 12,
  margin: 0,
  background: active ? 'var(--gold-wash)' : 'transparent',
});
