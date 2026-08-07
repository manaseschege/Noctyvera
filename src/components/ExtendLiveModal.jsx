import { useEffect, useRef, useState } from 'react';
import { App, Button, Modal, Result, Segmented, Spin, Tag } from 'antd';
import { ClockCircleOutlined, ThunderboltFilled } from '@ant-design/icons';
import { billingApi, liveApi } from '../api';
import { formatMinor } from '../api/currency';
import { useI18n } from '../i18n/useT';
import MomoNumberField from './MomoNumberField';
import PaymentMethodPicker from './PaymentMethodPicker';

/** The lengths offered. Trimmed to whatever the daily ceiling still allows. */
const BLOCKS = [15, 30, 60];

/**
 * Buying more minutes, mid-broadcast.
 *
 * The point of this screen is speed: it opens when someone is live, running out,
 * and being watched. So it preselects a length, remembers the last number used,
 * and never asks anything it can answer itself.
 *
 * The minutes are not granted until the purchase settles, which on mobile money
 * is a couple of minutes away — so this waits, and says so, rather than closing
 * on an optimistic "done" that would leave her cut off anyway.
 */
export default function ExtendLiveModal({ open, onClose, allowance, onExtended }) {
  const { t, lang } = useI18n();
  const { message } = App.useApp();

  const [minutes, setMinutes] = useState(BLOCKS[0]);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [settled, setSettled] = useState(null);
  const [methods, setMethods] = useState([]);
  const [method, setMethod] = useState(null);
  const [msisdn, setMsisdn] = useState('');
  const [touched, setTouched] = useState(false);
  const abortRef = useRef(null);

  const selected = methods.find((m) => m.code === method);
  const needsMsisdn = Boolean(selected?.requiresPayerMsisdn);

  useEffect(() => {
    if (!open) return undefined;
    setCheckout(null);
    setSettled(null);
    setTouched(false);
    setMsisdn(billingApi.lastMsisdn());

    let live = true;
    billingApi
      .paymentMethods()
      .then((list) => {
        if (!live) return;
        setMethods(list ?? []);
        setMethod((c) => c ?? list?.find((m) => m.isDefault)?.code ?? list?.[0]?.code ?? null);
      })
      .catch(() => setMethods([]));
    return () => {
      live = false;
    };
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Never offer more than the daily ceiling leaves room for.
  const headroom = Math.max(0, (allowance?.maxMinutesPerDay ?? 0) - (allowance?.boughtMinutes ?? 0));
  const options = BLOCKS.filter((b) => b <= headroom);
  const perMinute = allowance?.pricePerMinuteMinor ?? 0;
  const total = perMinute * minutes;

  const buy = async () => {
    if (needsMsisdn && !billingApi.isValidMsisdn(msisdn)) {
      setTouched(true);
      return;
    }
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await liveApi.extend(minutes, {
        method: method ?? undefined,
        payerMsisdn: needsMsisdn ? msisdn.trim() : undefined,
      });
      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      let final = billingApi.isSettled(res) ? res.purchase : null;
      if (!final) {
        final = await billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });
      }
      if (controller.signal.aborted) return;

      setSettled(final ?? res.purchase);
      if (final?.status === 'COMPLETED') {
        if (needsMsisdn) billingApi.rememberMsisdn(msisdn.trim());
        onExtended?.();
      }
    } catch (e) {
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

  /* ── Nothing left to sell ── */
  if (open && (!allowance?.extendable || options.length === 0)) {
    return (
      <Modal open={open} onCancel={close} width={420} destroyOnHidden
             footer={<Button type="primary" onClick={close}>{t('common.done')}</Button>}>
        <Result
          status="info"
          title={t('live.cannotExtend')}
          subTitle={allowance?.extendable ? t('live.dailyCapReached') : t('live.extendUnavailable')}
        />
      </Modal>
    );
  }

  /* ── Finished ── */
  if (settled) {
    const won = settled.status === 'COMPLETED';
    const pending = settled.status === 'PENDING';
    return (
      <Modal open={open} onCancel={close} width={420} destroyOnHidden
             footer={<Button type="primary" onClick={close}>{t('common.done')}</Button>}>
        <Result
          status={won ? 'success' : pending ? 'info' : 'error'}
          title={won ? t('live.extended', { minutes }) : pending ? t('billing.stillWaiting') : t('billing.paymentFailed')}
          subTitle={won
            ? t('live.extendedBody')
            : pending
              ? t('billing.stillWaitingBody')
              : settled.failureReason || t('billing.declined')}
        />
      </Modal>
    );
  }

  /* ── Waiting on the handset ── */
  if (checkout && busy) {
    return (
      <Modal open={open} onCancel={close} width={420} destroyOnHidden
             footer={<Button onClick={close}>{t('billing.cancelWait')}</Button>}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="large" />
          <h3 className="serif" style={{ fontSize: 22, margin: '22px 0 8px' }}>{t('billing.checkPhone')}</h3>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, maxWidth: 320, margin: '0 auto' }}>
            {msisdn ? t('billing.checkPhoneBody', { msisdn: msisdn.trim() }) : checkout.instructions}
          </p>
          <Tag color="gold" style={{ marginTop: 18 }}>{formatMinor(total, allowance?.currency, lang)}</Tag>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={close}
      width={420}
      destroyOnHidden
      title={<><ClockCircleOutlined /> {t('live.extendTitle')}</>}
      footer={[
        <Button key="c" onClick={close}>{t('common.notNow')}</Button>,
        <Button key="ok" type="primary" loading={busy} onClick={buy} icon={<ThunderboltFilled />}>
          {t('live.buyMinutes', { price: formatMinor(total, allowance?.currency, lang) })}
        </Button>,
      ]}
    >
      <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 0 }}>
        {t('live.extendBody', { remaining: allowance?.remainingMinutes ?? 0 })}
      </p>

      <Segmented
        block
        value={minutes}
        onChange={setMinutes}
        options={options.map((m) => ({ value: m, label: t('live.minutes', { count: m }) }))}
      />

      <PaymentMethodPicker methods={methods} value={method} onChange={setMethod} disabled={busy} />

      {needsMsisdn && (
        <MomoNumberField value={msisdn} onChange={setMsisdn} touched={touched} disabled={busy} />
      )}

      <p className="faint" style={{ fontSize: 12, marginTop: 14, marginBottom: 0, lineHeight: 1.6 }}>
        {t('live.extendNote')}
      </p>
    </Modal>
  );
}
