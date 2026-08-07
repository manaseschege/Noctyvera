import { useEffect, useRef, useState } from 'react';
import { App, Button, Modal, Result, Space, Spin, Tag } from 'antd';
import { LockFilled, PictureFilled, ThunderboltFilled, VideoCameraFilled } from '@ant-design/icons';
import { billingApi } from '../api';
import { useAuth } from '../store/auth';
import { formatDisplay } from '../api/currency';
import { useI18n } from '../i18n/useT';
import MomoNumberField from './MomoNumberField';
import PaymentMethodPicker from './PaymentMethodPicker';

/**
 * Buying one thing.
 *
 * There is no menu here any more — no bundle, no all-access plan, no choice of
 * tier. A viewer taps a locked tile and this asks for that tile's price. The
 * decision was made before the modal opened, so the modal's whole job is to
 * confirm and get out of the way.
 *
 * `item` is `{ id, kind: 'media' | 'live', title, priceMinor, priceDisplay,
 * currency, creatorName }` — the caller already has all of it from the gallery
 * or the listing, so nothing is fetched to open this.
 *
 * ── Three outcomes, not two ────────────────────────────────────
 * On Mobile Money the purchase does not resolve inside the request: a prompt
 * goes to the payer's handset and the answer arrives minutes later. So waiting
 * can end three ways — paid, declined, or *still open* — and the third is not a
 * failure. Telling someone their payment failed while the prompt is still live
 * on their phone invites them to pay twice, so it gets its own screen.
 */
export default function CheckoutModal({ open, onClose, item, onSettled }) {
  const { t, lang } = useI18n();
  const { message } = App.useApp();
  const { loadEntitlements, entitlements } = useAuth();

  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [settled, setSettled] = useState(null);
  const [msisdn, setMsisdn] = useState('');
  const [touched, setTouched] = useState(false);
  const [methods, setMethods] = useState([]);
  const [method, setMethod] = useState(null);
  const abortRef = useRef(null);

  // Per method, not per deployment: Stripe must not be asked for a handset just
  // because mobile money is also on offer.
  const selected = methods.find((m) => m.code === method);
  const needsMsisdn = selected
    ? selected.requiresPayerMsisdn
    : billingApi.requiresPayerMsisdn(entitlements);

  useEffect(() => {
    if (!open) return;
    setCheckout(null);
    setSettled(null);
    setTouched(false);
    // Offer the last number that actually paid. Most people use one handset.
    setMsisdn(billingApi.lastMsisdn());

    let live = true;
    billingApi
      .paymentMethods()
      .then((list) => {
        if (!live) return;
        setMethods(list ?? []);
        setMethod((current) => current ?? list?.find((m) => m.isDefault)?.code ?? list?.[0]?.code ?? null);
      })
      // The list failing is not a reason to block a purchase: leaving `method`
      // null makes the server fall back to its own default, which is exactly
      // what happened before there was a picker at all.
      .catch(() => setMethods([]));
    return () => {
      live = false;
    };
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const buy = async () => {
    if (needsMsisdn && !billingApi.isValidMsisdn(msisdn)) {
      setTouched(true);
      return;
    }

    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payment = {
        method: method ?? undefined,
        payerMsisdn: needsMsisdn ? msisdn.trim() : undefined,
      };
      const res = item.kind === 'live'
        ? await billingApi.buyLiveAccess(item.id, payment)
        : await billingApi.unlockMedia(item.id, payment);

      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      // Already paid — skip the waiting screen for something that will never change.
      let final = billingApi.isSettled(res) ? res.purchase : null;
      if (!final) {
        final = await billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });
      }

      // The payer closed the modal while we were polling; they have moved on.
      if (controller.signal.aborted) return;

      setSettled(final ?? res.purchase);
      if (final?.status === 'COMPLETED') {
        // Only worth remembering a number that a provider actually accepted.
        if (payment.payerMsisdn) billingApi.rememberMsisdn(payment.payerMsisdn);
        await loadEntitlements();
        onSettled?.(final);
      }
    } catch (e) {
      // The server distinguishes "mobile money is down" from "you got it wrong";
      // both arrive as a message worth showing verbatim.
      message.error(e.code === 'momo_unavailable' ? t('billing.momoUnavailable') : e.message);
      setCheckout(null);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  if (!item) return null;

  const price = formatDisplay(item.priceDisplay, item.currency, lang);
  const credit = billingApi.creditBalance(entitlements);

  /* ── Finished, one way or another ── */
  if (settled) {
    const status = settled.status;

    // Still PENDING means the window closed before the payer answered — the
    // prompt is alive and the server settles it whenever they do.
    if (status === 'PENDING') {
      return (
        <Modal open={open} onCancel={close} width={420} destroyOnHidden
               footer={<Button type="primary" onClick={close}>{t('common.done')}</Button>}>
          <Result
            status="info"
            title={t('billing.stillWaiting')}
            subTitle={t('billing.stillWaitingBody')}
          />
        </Modal>
      );
    }

    const won = status === 'COMPLETED';
    return (
      <Modal open={open} onCancel={close} width={420} destroyOnHidden
             footer={<Button type="primary" onClick={close}>{t('common.done')}</Button>}>
        <Result
          status={won ? 'success' : 'error'}
          title={won ? t('billing.paymentReceived') : t('billing.paymentFailed')}
          subTitle={won
            ? t('billing.itemOpen', { title: item.title })
            : settled.failureReason || t('billing.declined')}
        />
      </Modal>
    );
  }

  /* ── Waiting on an out-of-band payment ── */
  if (checkout && busy) {
    const onPhone = checkout.action === 'PROMPT_ON_PHONE';
    return (
      <Modal open={open} onCancel={close} width={420} destroyOnHidden
             footer={<Button onClick={close}>{t('billing.cancelWait')}</Button>}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <h3 className="serif" style={{ fontSize: 22, margin: '22px 0 8px' }}>
            {onPhone ? t('billing.checkPhone') : t('billing.waiting')}
          </h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
            {onPhone && msisdn
              ? t('billing.checkPhoneBody', { msisdn: msisdn.trim() })
              : checkout.instructions || t('onboarding.waitingBody')}
          </p>
          <Tag color="gold" style={{ marginTop: 18 }}>{price}</Tag>
        </div>
      </Modal>
    );
  }

  /* ── Confirming ── */
  return (
    <Modal
      open={open}
      onCancel={close}
      width={420}
      destroyOnHidden
      title={<Space><LockFilled style={{ color: 'var(--gold)' }} />{t('billing.checkoutTitle')}</Space>}
      footer={[
        <Button key="c" onClick={close}>{t('common.notNow')}</Button>,
        <Button key="ok" type="primary" loading={busy} onClick={buy} icon={<ThunderboltFilled />}>
          {needsMsisdn ? t('billing.payWithMomo', { price }) : t('billing.payAmount', { price })}
        </Button>,
      ]}
    >
      <div className="checkout-item">
        <span className="checkout-item-icon">
          {item.kind === 'live' ? <VideoCameraFilled /> : <PictureFilled />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="checkout-item-title">{item.title}</div>
          <div className="checkout-item-sub">
            {item.creatorName
              ? t('billing.oneItemFrom', { username: item.creatorName })
              : t('billing.oneItem')}
          </div>
        </div>
        <span className="checkout-item-price">{price}</span>
      </div>

      {credit > 0 && (
        <div className="checkout-credit">
          {t('billing.creditWillApply', {
            amount: formatDisplay(entitlements.creditBalanceDisplay, entitlements.currency, lang),
          })}
        </div>
      )}

      <PaymentMethodPicker
        methods={methods}
        value={method}
        onChange={setMethod}
        disabled={busy}
      />

      {needsMsisdn && (
        <MomoNumberField
          value={msisdn}
          onChange={setMsisdn}
          touched={touched}
          disabled={busy}
          autoFocus={!msisdn}
        />
      )}

      <p className="faint" style={{ fontSize: 12, marginTop: 14, marginBottom: 0, lineHeight: 1.6 }}>
        {t('billing.perItemNote')}
      </p>
    </Modal>
  );
}
