import { useAuthedFile } from '../hooks/useAuthedFile';
import { fallbackDataUri } from './placeholder';
import { useT } from '../i18n/useT';


/** <img> for a token-protected file. Falls back to a gradient on failure. */
export function AuthedImage({ path, mimeType, alt = '', seed, label, style, className, ...rest }) {
  const { url, loading, error } = useAuthedFile(path, mimeType);
  const src = url ?? (loading ? null : fallbackDataUri(seed ?? alt ?? 'file', label ?? alt));

  return (
    <img
      src={src ?? fallbackDataUri(seed ?? 'loading', label ?? '')}
      alt={alt}
      draggable={false}
      className={`smart-img${url || error ? ' is-ready' : ''}${className ? ` ${className}` : ''}`}
      style={style}
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

  return <video src={url} poster={poster} controls={controls} playsInline style={style} {...rest} />;
}
