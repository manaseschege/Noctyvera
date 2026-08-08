import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { billingApi } from '../../api';
import { useAuth } from '../../store/auth';
import { useT } from '../../i18n/useT';

/**
 * Where Stripe sends the payer back to.
 *
 * <p><b>Arriving here proves nothing.</b> The URL is just a redirect target: a
 * payer can reach it with the back button, by editing the address bar, or after
 * abandoning the card form entirely. So this polls the purchase and believes the
 * server, rather than trusting the fact of the redirect — otherwise "success"
 * would be a page anyone could visit to unlock something.
 *
 * <p>The cancel route lands here too, with `outcome="cancelled"`, because the
 * honest thing to tell someone who backed out is the same either way: here is
 * what the purchase actually says.
 */
export default function CheckoutReturn({ outcome = 'done' }) {
  const t = useT();
  const navigate = useNavigate();
  const params = useParams();
  const [search] = useSearchParams();
  const { loadEntitlements } = useAuth();

  const purchaseId = search.get('purchase') ?? params.purchaseId ?? null;
  const [purchase, setPurchase] = useState(null);
  const [waiting, setWaiting] = useState(Boolean(purchaseId) && outcome !== 'cancelled');
  const abortRef = useRef(null);

  useEffect(() => {
    if (!purchaseId || outcome === 'cancelled') {
      setWaiting(false);
      return undefined;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    billingApi
      .waitForSettlement(purchaseId, { signal: controller.signal })
      .then(async (final) => {
        if (controller.signal.aborted) return;
        setPurchase(final);
        // Card payments settle in seconds, so what someone owns has changed by
        // the time they land here.
        if (final?.status === 'COMPLETED') await loadEntitlements();
      })
      .finally(() => !controller.signal.aborted && setWaiting(false));

    return () => controller.abort();
  }, [purchaseId, outcome, loadEntitlements]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const go = () => navigate('/discover', { replace: true });

  if (waiting) {
    return (
      <div className="shell" style={{ padding: '80px 0', textAlign: 'center' }}>
        <Spin size="large" />
        <h1 className="serif" style={{ fontSize: 26, margin: '24px 0 8px' }}>{t('billing.confirming')}</h1>
        <p className="muted" style={{ fontSize: 14, maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
          {t('billing.confirmingBody')}
        </p>
      </div>
    );
  }

  const status = purchase?.status;
  const won = status === 'COMPLETED';
  const pending = status === 'PENDING';
  const cancelled = outcome === 'cancelled' && !won;

  // We never managed to read the purchase — usually the session was lost across
  // the redirect, so the polls came back 401. That is not the same as failure,
  // and must not be reported as one: telling somebody who has just handed over a
  // card that nothing was charged is how a single payment becomes two.
  const unknown = !purchase && !cancelled;

  return (
    <div className="shell" style={{ padding: '60px 0' }}>
      <Result
        status={won ? 'success' : cancelled || pending || unknown ? 'info' : 'error'}
        title={
          won ? t('billing.paymentReceived')
            : cancelled ? t('billing.cancelledTitle')
              : unknown ? t('billing.cannotConfirm')
                : pending ? t('billing.stillWaiting')
                  : t('billing.paymentFailed')
        }
        subTitle={
          won ? t('billing.cardDoneBody')
            : cancelled ? t('billing.cancelledBody')
              : unknown ? t('billing.cannotConfirmBody')
                : pending ? t('billing.stillWaitingBody')
                  : purchase?.failureReason || t('billing.noMoneyTaken')
        }
        extra={[
          <Button key="go" type="primary" onClick={go}>{t('nav.browseMembers')}</Button>,
          <Button key="billing" onClick={() => navigate('/me/billing')}>{t('billing.title')}</Button>,
        ]}
      />
    </div>
  );
}
