import { Link } from 'react-router-dom';
import { EnvironmentOutlined, LockFilled, PictureFilled, VideoCameraFilled } from '@ant-design/icons';
import SmartImage from './SmartImage';
import { AuthedImage } from './AuthedFile';
import { coverOf, lockedCount, toFetchPath } from '../api/members';
import { formatDisplay } from '../api/currency';
import { useI18n } from '../i18n/useT';

/**
 * A MemberCardResponse rendered as the browse tile.
 *
 * Everything here is free to look at — the preview photo, the city, the counts
 * of what's still locked — because that's what sells the profile.
 *
 * **The price is never hidden behind hover.** It lived in the reveal at first,
 * which meant the single most important commercial fact on the card was
 * invisible until you moved a mouse over it — and on a phone, where there is no
 * hover, invisible full stop. It sits in the top row now, always on.
 */
export default function MemberCard({ member }) {
  const { t, lang } = useI18n();
  if (!member) return null;

  const cover = coverOf(member);
  const locked = lockedCount(member);
  const fetchPath = toFetchPath(cover);
  // Each creator names her own price, and the card carries it — showing a
  // single platform-wide figure was a lie the moment prices stopped being
  // uniform.
  const price = member.unlockPriceDisplay
    ? formatDisplay(member.unlockPriceDisplay, member.currency, lang)
    : null;

  return (
    <Link to={`/m/${member.userId}`} className="creator-card">
      <div className="creator-card-media">
        {/* A preview entry is a path on this API (bearer-auth) unless it's an
            absolute CDN URL. Fetch the former, point straight at the latter. */}
        {fetchPath ? (
          <AuthedImage path={fetchPath} alt={member.username} seed={member.userId} label={member.username} />
        ) : (
          <SmartImage src={cover} alt={member.username} seed={member.userId} label={member.username} />
        )}
        <div className="creator-card-scrim" />

        <div className="creator-card-top">
          <span className="creator-card-flags">
            {member.liveNow && (
              <span className="pill pill-live">
                <span className="live-dot" /> {t('common.live').toUpperCase()}
              </span>
            )}
            {locked > 0 && !member.unlocked && (
              <span className="pill pill-dark">
                <LockFilled /> {locked}
              </span>
            )}
          </span>

          {member.unlocked ? (
            <span className="pill pill-gold">{t('common.unlocked')}</span>
          ) : (
            price && <span className="creator-card-price">{price}</span>
          )}
        </div>

        <div className="creator-card-body">
          <div className="creator-card-name">
            {member.username}
            {member.age ? <span className="muted" style={{ fontWeight: 400 }}>· {member.age}</span> : null}
          </div>

          <div className="creator-card-meta">
            {member.city && (
              <span>
                <EnvironmentOutlined /> {member.city}
              </span>
            )}
            {member.vibe && (
              <>
                <span className="faint">·</span>
                <span>{t(`enums.vibe.${member.vibe}`)}</span>
              </>
            )}
          </div>

          {/* Secondary detail. Hover-revealed on a mouse so the resting grid
              stays calm; always open where there is no hover to reveal it. */}
          <div className="creator-card-reveal">
            {member.bio && <span className="creator-card-tagline">{member.bio}</span>}
            <span className="creator-card-counts">
              <span title={t('common.photos')}>
                <PictureFilled /> {member.lockedPhotoCount ?? 0}
              </span>
              <span title={t('common.clips')}>
                <VideoCameraFilled /> {member.lockedVideoCount ?? 0}
              </span>
              {!member.unlocked && price && (
                <span className="creator-card-unlock-hint">{t('discover.unlockAll')}</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
