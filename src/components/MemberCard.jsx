import { Link } from 'react-router-dom';
import { EnvironmentOutlined, LockFilled, PictureFilled, VideoCameraFilled } from '@ant-design/icons';
import SmartImage from './SmartImage';
import { AuthedImage } from './AuthedFile';
import { coverOf, lockedCount, toFetchPath } from '../api/members';
import { useT } from '../i18n/useT';

/**
 * A MemberCardResponse rendered as the browse tile.
 * Everything here is free to look at — the preview photo, the city, the
 * counts of what's still locked — because that's what sells the profile.
 */
export default function MemberCard({ member }) {
  const t = useT();
  if (!member) return null;

  const cover = coverOf(member);
  const locked = lockedCount(member);
  const fetchPath = toFetchPath(cover);

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
          <span style={{ display: 'flex', gap: 6 }}>
            {member.liveNow && (
              <span className="pill pill-live">
                <span className="live-dot" /> {t('common.live').toUpperCase()}
              </span>
            )}
          </span>
          {locked > 0 && !member.unlocked && (
            <span className="pill pill-gold">
              <LockFilled /> {locked}
            </span>
          )}
          {member.unlocked && <span className="pill pill-gold">{t('common.unlocked')}</span>}
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

          <div className="creator-card-reveal">
            {member.bio && <span className="creator-card-tagline">{member.bio}</span>}
            <span className="creator-card-counts">
              <span>
                <PictureFilled /> {member.lockedPhotoCount ?? 0}
              </span>
              <span>
                <VideoCameraFilled /> {member.lockedVideoCount ?? 0}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
