import { PictureFilled, VideoCameraFilled, WifiOutlined } from '@ant-design/icons';
import { CREATOR_PACKAGES } from '../api/config';
import { humanDuration } from '../api/billing';
import { formatDisplay } from '../api/currency';
import { useI18n } from '../i18n/useT';

/**
 * The three creator packages, as cards.
 *
 * What each one covers is the decision being made, so the allowances are the
 * loudest thing on the card — not the price. A zero limit is drawn struck
 * through rather than hidden, because "Pro has no video" is the fact that makes
 * Pro cheaper, and hiding it is how somebody buys the wrong one.
 *
 * Inclusion is derived from the limits rather than read from `includesPhotos` /
 * `includesVideos` flags, which the API does not send — reading them made every
 * card claim it covered nothing at all, which is a bad thing to tell someone
 * about the package they are one tap from paying for.
 *
 * Daily live minutes are shown because that is what actually separates the
 * tiers: 15 minutes against two hours is the reason to move up.
 */
export default function PackagePicker({ packages, value, onChange, currentCode, disabled }) {
  const { t, lang } = useI18n();
  if (!packages?.length) return null;

  return (
    <div className="package-grid">
      {packages.map((p) => {
        const meta = CREATOR_PACKAGES[p.code] ?? {};
        const active = value === p.code;
        const held = currentCode === p.code;
        const best = Boolean(meta.best);

        return (
          <button
            key={p.code}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange?.(p.code)}
            className={`package-card${active ? ' is-active' : ''}`}
            style={{ '--pkg-accent': meta.accent ?? 'var(--gold)' }}
          >
            {best && !held && <span className="package-flag">{t('packages.mostPopular')}</span>}
            {held && <span className="package-flag package-flag-held">{t('packages.current')}</span>}

            <div className="package-name">{p.label}</div>
            <div className="package-tagline">{p.tagline}</div>

            <div className="package-price">
              {formatDisplay(p.priceDisplay, p.currency, lang)}
              <span className="package-period"> / {humanDuration(p.duration)}</span>
            </div>

            <ul className="package-allowance">
              <li className={p.maxPhotos > 0 ? '' : 'is-excluded'}>
                <PictureFilled />
                {p.maxPhotos > 0
                  ? t('packages.upToPhotos', { count: p.maxPhotos })
                  : t('packages.noPhotos')}
              </li>
              <li className={p.maxPremiumVideos > 0 ? '' : 'is-excluded'}>
                <VideoCameraFilled />
                {p.maxPremiumVideos > 0
                  ? t('packages.upToVideos', { count: p.maxPremiumVideos })
                  : t('packages.noVideos')}
              </li>
              <li className={p.liveMinutesPerDay > 0 ? '' : 'is-excluded'}>
                <WifiOutlined />
                {liveAllowance(p, t)}
              </li>
            </ul>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The daily live allowance, in the unit a person would actually say it in.
 *
 * Built from `liveMinutesPerDay` rather than shown as the server's
 * `liveAllowanceLabel`, which is English-only — the French side of the site
 * would otherwise read "2 hours per day" in the middle of a French card.
 */
function liveAllowance(p, t) {
  const minutes = p.liveMinutesPerDay ?? 0;
  if (minutes <= 0) return t('packages.noLive');
  if (minutes % 60 === 0) return t('packages.liveHours', { count: minutes / 60 });
  return t('packages.liveMinutes', { count: minutes });
}
