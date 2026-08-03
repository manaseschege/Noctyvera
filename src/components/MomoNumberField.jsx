import { Input, Tooltip } from 'antd';
import { MobileOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { billingApi } from '../api';
import { useT } from '../i18n/useT';

/**
 * The handset a Mobile Money prompt gets sent to.
 *
 * Shown only where the server says a number is needed — `requiresPayerMsisdn`
 * on the entitlements payload — because on the auto and manual providers the
 * field is ignored, and asking for a number nobody will charge is worse than
 * not asking.
 *
 * Validation mirrors the server's `payerMsisdn` pattern exactly. It is
 * deliberately loose about spaces, brackets and a leading plus: that is how
 * people read a number off a SIM card, and the server strips all of it. What
 * this catches is the real mistake — a number too short to be one.
 *
 * `touched` exists so the error only appears once the payer has had a go.
 * Marking a field red before anyone has typed in it is just noise.
 */
export default function MomoNumberField({ value, onChange, touched, disabled, autoFocus }) {
  const t = useT();
  const invalid = touched && !billingApi.isValidMsisdn(value);

  return (
    <div style={{ marginTop: 16 }}>
      <label
        htmlFor="momo-msisdn"
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginBottom: 7 }}
      >
        <span className="eyebrow" style={{ marginBottom: 0 }}>{t('billing.momoNumber')}</span>
        <Tooltip title={t('billing.momoNumberHint')}>
          <QuestionCircleOutlined className="faint" style={{ fontSize: 12 }} />
        </Tooltip>
      </label>

      <Input
        id="momo-msisdn"
        size="large"
        inputMode="tel"
        autoComplete="tel"
        autoFocus={autoFocus}
        disabled={disabled}
        status={invalid ? 'error' : undefined}
        prefix={<MobileOutlined className="faint" />}
        placeholder={t('billing.momoPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <div
        className={invalid ? undefined : 'faint'}
        style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.55, color: invalid ? 'var(--danger)' : undefined }}
      >
        {invalid ? t('billing.momoInvalid') : t('billing.momoNote')}
      </div>
    </div>
  );
}
