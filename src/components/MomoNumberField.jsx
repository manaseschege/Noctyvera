import { Input, Select, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { billingApi } from '../api';
import { useT } from '../i18n/useT';

/**
 * Dialling codes offered as a prefix, so the payer types only the local part.
 *
 * Cameroon first because that is where the money is, then the neighbours a
 * member is plausibly roaming from. Not a full ISO list: a hundred-entry
 * dropdown to find the one you always use is worse than typing four digits.
 */
const DIAL_CODES = [
  { code: '237', label: '🇨🇲 +237' },
  { code: '234', label: '🇳🇬 +234' },
  { code: '233', label: '🇬🇭 +233' },
  { code: '254', label: '🇰🇪 +254' },
  { code: '225', label: '🇨🇮 +225' },
  { code: '221', label: '🇸🇳 +221' },
  { code: '241', label: '🇬🇦 +241' },
  { code: '235', label: '🇹🇩 +235' },
];

const DEFAULT_CODE = '237';

/** Split a stored international number back into prefix and local part. */
function split(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const match = DIAL_CODES.find((c) => digits.startsWith(c.code));
  if (match) return { code: match.code, local: digits.slice(match.code.length) };
  return { code: DEFAULT_CODE, local: digits };
}

/**
 * The handset a Mobile Money prompt gets sent to.
 *
 * Shown only where the chosen method says it needs a number — on the auto and
 * manual providers, and on Stripe, the field is ignored, and asking for a number
 * nobody will charge is worse than not asking.
 *
 * The country code is a dropdown rather than something to type. Asking a payer
 * to enter `237689686224` means twelve digits with no spaces and no way to check
 * their own work; picking +237 and typing the nine they know off by heart is the
 * same value with far less to get wrong. The two are recombined on the way out,
 * so the server still receives one international number and none of this is
 * visible in the API.
 */
export default function MomoNumberField({ value, onChange, touched, disabled, autoFocus }) {
  const t = useT();
  const { code, local } = split(value);
  const invalid = touched && !billingApi.isValidMsisdn(value);

  const emit = (nextCode, nextLocal) => {
    const digits = String(nextLocal ?? '').replace(/\D/g, '');
    // Leading zeros are how the number is written locally and are dropped when
    // it is dialled internationally - 06XX becomes +237 6XX.
    onChange(digits ? `${nextCode}${digits.replace(/^0+/, '')}` : '');
  };

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
        inputMode="numeric"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        disabled={disabled}
        status={invalid ? 'error' : undefined}
        placeholder="6XX XXX XXX"
        value={local}
        onChange={(e) => emit(code, e.target.value)}
        addonBefore={
          <Select
            value={code}
            disabled={disabled}
            onChange={(next) => emit(next, local)}
            options={DIAL_CODES.map((c) => ({ value: c.code, label: c.label }))}
            style={{ width: 104 }}
            popupMatchSelectWidth={false}
          />
        }
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
