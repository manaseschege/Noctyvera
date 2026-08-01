import { PictureFilled, VideoCameraFilled } from '@ant-design/icons';
import { CREATOR_PACKAGES } from '../api/config';
import { humanDuration } from '../api/billing';
import { formatDisplay } from '../api/currency';
import { useI18n } from '../i18n/useT';

/**
 * The three creator packages, as cards.
 *
 * What each one covers is the decision being made, so the allowances are the
 * loudest thing on the card — not the price. A zero limit is drawn struck
 * through rather than hidden, because "silver has no photos" is the fact that
 * makes silver cheaper, and hiding it is how somebody buys the wrong one.
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
        const best = p.code === 'GOLD';

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
              <li className={p.includesPhotos ? '' : 'is-excluded'}>
                <PictureFilled />
                {p.includesPhotos
                  ? t('packages.upToPhotos', { count: p.maxPhotos })
                  : t('packages.noPhotos')}
              </li>
              <li className={p.includesVideos ? '' : 'is-excluded'}>
                <VideoCameraFilled />
                {p.includesVideos
                  ? t('packages.upToVideos', { count: p.maxVideos })
                  : t('packages.noVideos')}
              </li>
            </ul>
          </button>
        );
      })}
    </div>
  );
}
