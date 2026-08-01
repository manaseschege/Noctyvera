import { useEffect, useRef, useState } from 'react';
import { App, Button, Modal, Result, Space, Spin, Tag } from 'antd';
import { LockFilled, PictureFilled, ThunderboltFilled, VideoCameraFilled } from '@ant-design/icons';
import { billingApi } from '../api';
import { useAuth } from '../store/auth';
import { formatDisplay } from '../api/currency';
import { useI18n } from '../i18n/useT';

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
 */
export default function CheckoutModal({ open, onClose, item, onSettled }) {
  const { t, lang } = useI18n();
  const { message } = App.useApp();
  const { loadEntitlements, entitlements } = useAuth();

  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [settled, setSettled] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setCheckout(null);
    setSettled(null);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const buy = async () => {
    setBusy(true);
    try {
      const res = item.kind === 'live'
        ? await billingApi.buyLiveAccess(item.id)
        : await billingApi.unlockMedia(item.id);

      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      // Already paid — skip the waiting screen for something that will never change.
      let final = billingApi.isSettled(res) ? res.purchase : null;
      if (!final) {
        const controller = new AbortController();
        abortRef.current = controller;
        final = await billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });
      }

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

  if (!item) return null;

  const price = formatDisplay(item.priceDisplay, item.currency, lang);
  const credit = billingApi.creditBalance(entitlements);

  /* ── Settled ── */
  if (settled) {
    const won = settled.status === 'COMPLETED';
    return (
      <Modal open={open} onCancel={close} width={420} destroyOnHidden
             footer={<Button type="primary" onClick={close}>{t('common.done')}</Button>}>
        <Result
          status={won ? 'success' : 'error'}
          title={won ? t('billing.paymentReceived') : t('billing.paymentFailed')}
          subTitle={won
            ? t('billing.itemOpen', { title: item.title })
            : settled.failureReason || t('billing.noMoneyTaken')}
        />
      </Modal>
    );
  }

  /* ── Waiting on an out-of-band payment ── */
  if (checkout && busy) {
    return (
      <Modal open={open} onCancel={close} width={420} destroyOnHidden
             footer={<Button onClick={close}>{t('common.cancel')}</Button>}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <h3 className="serif" style={{ fontSize: 22, margin: '22px 0 8px' }}>
            {checkout.action === 'PROMPT_ON_PHONE' ? t('billing.checkPhone') : t('billing.waiting')}
          </h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
            {checkout.instructions || t('onboarding.waitingBody')}
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
          {t('billing.payAmount', { price })}
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

      <p className="faint" style={{ fontSize: 12, marginTop: 14, marginBottom: 0, lineHeight: 1.6 }}>
        {t('billing.perItemNote')}
      </p>
    </Modal>
  );
}
