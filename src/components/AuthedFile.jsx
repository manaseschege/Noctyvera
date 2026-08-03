import { useAuthedFile } from '../hooks/useAuthedFile';
import { fallbackDataUri } from './placeholder';
import { useT } from '../i18n/useT';


/**
 * Stop the browser's own "save this" affordances.
 *
 * Right-click → Save image/video as… is the one-click way to walk off with paid
 * content, and it costs nothing to close. Worth being clear about the limit
 * though: anything the browser can display, the person watching can ultimately
 * capture — a screen recorder defeats all of this. These measures remove the
 * casual path, they are not DRM, and treating them as DRM would be a mistake.
 */
const noSaving = {
  onContextMenu: (e) => e.preventDefault(),
  onDragStart: (e) => e.preventDefault(),
  draggable: false,
};

/** <img> for a token-protected file. Falls back to a gradient on failure. */
export function AuthedImage({ path, mimeType, alt = '', seed, label, style, className, ...rest }) {
  const { url, loading, error } = useAuthedFile(path, mimeType);
  const src = url ?? (loading ? null : fallbackDataUri(seed ?? alt ?? 'file', label ?? alt));

  return (
    <img
      src={src ?? fallbackDataUri(seed ?? 'loading', label ?? '')}
      alt={alt}
      className={`smart-img${url || error ? ' is-ready' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      {...noSaving}
      {...rest}
    />
  );
}

/** <video> for a token-protected file. */
export function AuthedVideo({ path, mimeType = 'video/mp4', style, poster, controls = true, ...rest }) {
  const t = useT();
  const { url, loading, error } = useAuthedFile(path, mimeType);

  if (loading) {
    return <div className="smart-img" style={{ width: '100%', height: '100%', ...style }} />;
  }

  if (error || !url) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          background: '#0e0d13',
          color: 'var(--text-faint)',
          fontSize: 12,
          textAlign: 'center',
          padding: 12,
          ...style,
        }}
      >
        {error?.status === 402 ? t('common.locked') : t('media.unavailable')}
      </div>
    );
  }

  return (
    <video
      src={url}
      poster={poster}
      controls={controls}
      playsInline
      // Chrome and Edge put a download button in the native control bar and a
      // "Save video as…" in the context menu. Both hand a paid clip over in one
      // click, so both are removed here.
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      style={style}
      {...noSaving}
      {...rest}
    />
  );
}
