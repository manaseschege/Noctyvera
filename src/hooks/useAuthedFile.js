import { useEffect, useState } from 'react';
import { http } from '../api/http';

/**
 * Fetch an entitlement-gated media file and hand it to an <img>/<video> as
 * an object URL.
 *
 * The file endpoint enforces the paywall per item: a free preview photo is
 * served to anyone, but anything gated returns 401 to a request with no
 * bearer token — and the browser does NOT attach one to `<img src>` or
 * `<video src>`. That is why a plain src silently fails on clips. Going
 * through the http layer attaches the token and retries once via
 * /auth/refresh on a 401.
 *
 * The server does send correct content types (video/mp4, image/png) and
 * supports HTTP Range, so `mimeType` is only a fallback for the case where
 * a file comes back untyped.
 *
 * Trade-off: an object URL downloads the whole file before playback and
 * can't seek past it. Fine for short clips. If long video is ever on the
 * cards, switch clips back to a direct `src` — the endpoint already
 * supports Range — and solve auth with a signed URL or a cookie instead.
 */
export function useAuthedFile(path, mimeType) {
  const [state, setState] = useState({ url: null, loading: Boolean(path), error: null });

  useEffect(() => {
    if (!path) {
      setState({ url: null, loading: false, error: null });
      return undefined;
    }

    let objectUrl = null;
    let cancelled = false;
    setState({ url: null, loading: true, error: null });

    http
      .blob(path)
      .then((blob) => {
        if (cancelled) return;
        // Re-type when the server was vague, so <video> will accept it.
        const usable =
          mimeType && (!blob.type || blob.type === 'application/octet-stream')
            ? blob.slice(0, blob.size, mimeType)
            : blob;
        objectUrl = URL.createObjectURL(usable);
        setState({ url: objectUrl, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ url: null, loading: false, error });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, mimeType]);

  return state;
}
