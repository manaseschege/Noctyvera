import { LockFilled, PlayCircleFilled } from '@ant-design/icons';
import SmartImage from './SmartImage';
import { AuthedImage, AuthedVideo } from './AuthedFile';
import { filePath } from '../api/members';
import { useT } from '../i18n/useT';

/**
 * One item in a member's gallery.
 *
 * Locked items keep a placeholder rather than disappearing — that teaser is
 * what turns a browsing visitor into a paying one. The server withholds the
 * file entirely, so there is nothing to leak client-side.
 *
 * A clip has to render in a <video>, not an <img>: an image element can't
 * decode video bytes and falls back to a broken-image icon. `preload="metadata"`
 * makes the browser paint the first frame as the thumbnail.
 *
 * `ratio` keeps a post's real proportions in the masonry feed; pass
 * `square` for the fixed grids.
 */
export default function MediaTile({ item, onOpen, square = false }) {
  const t = useT();
  const locked = !item.unlocked;
  const isVideo = item.type === 'video';
  const aspect = square ? '1 / 1' : `1 / ${1 / (item.ratio || 1)}`;

  const cover = () => {
    if (!item.mediaId) {
      return <SmartImage src={item.thumbUrl} alt={item.title} seed={item.id} label={item.title} />;
    }
    if (isVideo) {
      return (
        <AuthedVideo
          path={filePath(item.mediaId)}
          mimeType={item.contentType}
          controls={false}
          muted
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      );
    }
    return (
      <AuthedImage
        path={filePath(item.mediaId)}
        mimeType={item.contentType}
        alt={item.title}
        seed={item.id}
        label={item.title}
      />
    );
  };

  return (
    <div
      className={`media-tile${locked ? ' locked' : ''}`}
      style={{ aspectRatio: aspect }}
      onClick={() => onOpen?.(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen?.(item)}
    >
      {cover()}

      {/* A still frame reads as a photo — mark clips so the play affordance
          is obvious before anyone clicks. */}
      {isVideo && !locked && (
        <span className="media-tile-play" aria-hidden="true">
          <PlayCircleFilled />
        </span>
      )}

      <div className="media-tile-corner">
        {isVideo && !locked && (
          <span className="pill">
            <PlayCircleFilled /> {t('media.clip')}
          </span>
        )}
        {!locked && item.visibility === 'public' && <span className="pill">{t('media.free')}</span>}
      </div>

      {locked ? (
        <div className="media-lock-overlay">
          <span className="media-lock-icon">
            <LockFilled />
          </span>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t('common.locked')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {isVideo ? t('media.clip') : t('media.photo')} · {t('profile.unlockToView')}
          </div>
        </div>
      ) : (
        item.title && (
          <div className="media-tile-footer">
            <div className="media-tile-title">{item.title}</div>
          </div>
        )
      )}
    </div>
  );
}
