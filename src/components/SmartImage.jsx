import { useEffect, useRef, useState } from 'react';
import { fallbackDataUri } from './placeholder';

/**
 * Image that behaves like one in a shipped app: shimmer while loading,
 * fade-in once decoded, deterministic gradient if the source fails.
 */
export default function SmartImage({ src, alt = '', seed, label, style, className, ...rest }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [src]);

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setReady(true);
  }, [src]);

  const resolved = !src || failed ? fallbackDataUri(seed ?? alt ?? 'nightgals', label ?? alt) : src;

  return (
    <img
      ref={ref}
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => setReady(true)}
      onError={() => setFailed(true)}
      className={`smart-img${ready ? ' is-ready' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      {...rest}
    />
  );
}
