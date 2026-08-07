import { CheckCircleFilled, CreditCardFilled, MobileOutlined, WalletFilled } from '@ant-design/icons';
import { useT } from '../i18n/useT';

/**
 * How the buyer wants to pay, chosen per purchase.
 *
 * The list comes from `GET /billing/payment-methods` rather than being written
 * out here: which methods exist is a deployment setting, and a hardcoded pair of
 * buttons would offer Stripe on a deployment that has no Stripe keys.
 *
 * Renders nothing when there is only one way to pay. A picker with a single
 * option is a question with one answer — it just adds a step between someone and
 * the thing they are trying to buy.
 */
export default function PaymentMethodPicker({ methods, value, onChange, disabled }) {
  const t = useT();
  if (!methods || methods.length < 2) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 9 }}>{t('billing.payWith')}</div>
      <div className="pay-methods">
        {methods.map((m) => {
          const active = m.code === value;
          return (
            <button
              key={m.code}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange?.(m.code)}
              className={`pay-method${active ? ' is-active' : ''}`}
            >
              <span className="pay-method-icon">{iconFor(m.code)}</span>
              <span style={{ minWidth: 0 }}>
                <span className="pay-method-label">{m.label}</span>
                {m.description && <span className="pay-method-sub">{m.description}</span>}
              </span>
              {active && <CheckCircleFilled className="pay-method-tick" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Matched on the code rather than carried in the payload: an icon is a client
 * concern, and the server should not be shipping component names.
 */
function iconFor(code) {
  const c = (code ?? '').toUpperCase();
  if (c.includes('MOMO') || c.includes('MOBILE')) return <MobileOutlined />;
  if (c.includes('STRIPE') || c.includes('CARD')) return <CreditCardFilled />;
  return <WalletFilled />;
}
