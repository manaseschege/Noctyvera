import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Progress, Spin, Tag } from 'antd';
import { MobileOutlined, PictureFilled, ThunderboltFilled, VideoCameraFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { billingApi } from '../../api';
import { formatDisplay } from '../../api/currency';
import MomoNumberField from '../../components/MomoNumberField';
import PackagePicker from '../../components/PackagePicker';
import { PageHeader } from '../../components/ui';
import { useAuth } from '../../store/auth';
import { useI18n } from '../../i18n/useT';

/**
 * The creator's own package: what it covers, how much is left, and how to
 * change it.
 *
 * The allowance bars are the point of the page. A creator who cannot upload
 * needs to know in one glance whether that is because she is out of room or
 * because her package never covered that kind of media, and those two need
 * different actions.
 */
export default function MyPackage() {
  const { t, lang } = useI18n();
  const { message } = App.useApp();
  const { packageStatus, loadPackage, entitlements } = useAuth();

  const [packages, setPackages] = useState(null);
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [msisdn, setMsisdn] = useState(billingApi.lastMsisdn);
  const [touched, setTouched] = useState(false);
  const abortRef = useRef(null);

  const needsMsisdn = billingApi.requiresPayerMsisdn(entitlements);

  useEffect(() => {
    loadPackage();
    billingApi.creatorPackages().then(setPackages).catch((e) => message.error(e.message));
  }, [loadPackage, message]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const selected = packages?.find((p) => p.code === choice);

  const buy = useCallback(async () => {
    if (!choice) return;
    if (needsMsisdn && !billingApi.isValidMsisdn(msisdn)) {
      setTouched(true);
      message.warning(t('billing.momoRequired'));
      return;
    }

    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const number = needsMsisdn ? msisdn.trim() : undefined;
      const res = await billingApi.buyCreatorPackage(choice, number);
      setCheckout(res);

      if (res.action === 'REDIRECT' && res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }

      let settled = billingApi.isSettled(res) ? res.purchase : null;
      if (!settled) {
        settled = await billingApi.waitForSettlement(res.purchase.id, { signal: controller.signal });
      }
      if (controller.signal.aborted) return;

      if (settled?.status === 'COMPLETED') {
        if (number) billingApi.rememberMsisdn(number);
        await loadPackage();
        message.success(t('packages.activated'));
        setChoice(null);
      } else if (settled?.status === 'FAILED') {
        message.error(settled.failureReason || t('billing.declined'));
      } else {
        // Still PENDING. The prompt is alive on the handset and the server will
        // settle it whenever it is answered — saying "failed" here would invite
        // a second payment for the same package.
        message.info(t('billing.stillWaitingBody'));
      }
    } catch (e) {
      message.error(e.code === 'momo_unavailable' ? t('billing.momoUnavailable') : e.message);
    } finally {
      setBusy(false);
      setCheckout(null);
    }
  }, [choice, loadPackage, message, msisdn, needsMsisdn, t]);

  if (!packageStatus) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Nothing to sell where the deployment does not charge creators.
  if (!packageStatus.packagesRequired) {
    return (
      <>
        <PageHeader title={t('packages.title')} subtitle={t('packages.subtitle')} />
        <Alert type="info" showIcon message={t('packages.freeNow')} description={t('packages.freeNowBody')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('packages.title')}
        subtitle={t('packages.subtitle')}
        extra={
          packageStatus.active ? (
            <Tag color="gold" style={{ marginInlineEnd: 0 }}>
              {packageStatus.label} · {t('packages.renewsOn', {
                date: packageStatus.expiresAt ? dayjs(packageStatus.expiresAt).format('D MMM YYYY') : '—',
              })}
            </Tag>
          ) : null
        }
      />

      {packageStatus.active ? (
        <div className="allowance-row">
          <Allowance
            icon={<PictureFilled />}
            label={t('common.photos')}
            limit={packageStatus.photoLimit}
            used={packageStatus.photosUsed}
            remaining={packageStatus.photosRemaining}
            notIncluded={t('packages.notInThisPackage')}
            full={t('packages.allUsed')}
            left={t('packages.slotsLeft', { count: packageStatus.photosRemaining })}
          />
          <Allowance
            icon={<VideoCameraFilled />}
            label={t('common.clips')}
            limit={packageStatus.videoLimit}
            used={packageStatus.videosUsed}
            remaining={packageStatus.videosRemaining}
            notIncluded={t('packages.notInThisPackage')}
            full={t('packages.allUsed')}
            left={t('packages.slotsLeft', { count: packageStatus.videosRemaining })}
          />
        </div>
      ) : (
        <Alert
          type="warning"
          showIcon
          message={t('packages.noneActive')}
          description={t('packages.noneActiveBody')}
          style={{ marginBottom: 22 }}
        />
      )}

      <h2 className="section-title" style={{ margin: '30px 0 16px' }}>
        {packageStatus.active ? t('packages.changeTitle') : t('packages.chooseTitle')}
      </h2>

      {!packages ? (
        <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
      ) : (
        <>
          <PackagePicker
            packages={packages}
            value={choice}
            onChange={setChoice}
            currentCode={packageStatus.code}
            disabled={busy}
          />

          {needsMsisdn && (
            <div style={{ maxWidth: 420 }}>
              <MomoNumberField
                value={msisdn}
                onChange={setMsisdn}
                touched={touched}
                disabled={busy}
              />
            </div>
          )}

          {checkout && busy && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 18, maxWidth: 420 }}
              message={
                checkout.action === 'PROMPT_ON_PHONE' ? t('billing.checkPhone') : t('billing.waiting')
              }
              description={
                checkout.action === 'PROMPT_ON_PHONE' && msisdn
                  ? t('billing.checkPhoneBody', { msisdn: msisdn.trim() })
                  : checkout.instructions || t('onboarding.waitingBody')
              }
            />
          )}

          <div style={{ marginTop: 20, maxWidth: 420 }}>
            <Button
              type="primary"
              size="large"
              block
              loading={busy}
              disabled={!selected}
              onClick={buy}
              icon={<ThunderboltFilled />}
            >
              {selected
                ? selected.code === packageStatus.code
                  ? t('packages.renewFor', {
                      price: formatDisplay(selected.priceDisplay, selected.currency, lang),
                    })
                  : t('packages.switchTo', {
                      label: selected.label,
                      price: formatDisplay(selected.priceDisplay, selected.currency, lang),
                    })
                : t('packages.choose')}
            </Button>
            <div
              className="faint"
              style={{ fontSize: 12, marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}
            >
              <MobileOutlined style={{ marginTop: 2 }} />
              <span>{t('packages.phoneNote')}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** One media type's allowance. A zero limit is a different state from a full one. */
function Allowance({ icon, label, limit, used, remaining, notIncluded, full, left }) {
  const included = limit > 0;
  const pct = included ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const exhausted = included && remaining <= 0;

  return (
    <div className="allowance-card">
      <div className="allowance-head">
        <span className="allowance-icon">{icon}</span>
        <span className="allowance-label">{label}</span>
        <span className="allowance-count">{included ? `${used} / ${limit}` : '—'}</span>
      </div>
      <Progress
        percent={pct}
        showInfo={false}
        size="small"
        strokeColor={!included ? 'var(--line)' : exhausted ? 'var(--warning)' : 'var(--gold)'}
        trailColor="var(--line-soft)"
      />
      <div className="allowance-note">{!included ? notIncluded : exhausted ? full : left}</div>
    </div>
  );
}
