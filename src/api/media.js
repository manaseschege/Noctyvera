import { UPLOAD_LIMITS } from './config';
import { http } from './http';

/**
 * The signed-in user's own media.
 *
 *   GET    /me/media              everything, including items still in review
 *   POST   /me/media/photos       multipart: file + optional caption
 *   POST   /me/media/videos       multipart: file + optional caption
 *   PATCH  /me/media/{id}         caption, position, primary
 *   DELETE /me/media/{id}
 *
 * Uploads land as PENDING_REVIEW and only appear publicly once a
 * moderator approves them.
 */

export const mine = () => http.get('/me/media');

/**
 * Upload. `caption` and `tier` are query parameters — only the file itself
 * goes in the multipart body.
 */
const uploadPath = (base, { caption, tier }) => {
  const q = new URLSearchParams();
  if (caption) q.set('caption', caption);
  if (tier) q.set('tier', tier);
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
};

export const uploadPhoto = (file, { caption, tier } = {}) =>
  http.upload(uploadPath('/me/media/photos', { caption, tier }), file);

export const uploadVideo = (file, { caption, tier } = {}) =>
  http.upload(uploadPath('/me/media/videos', { caption, tier }), file);

/** Flip an existing post between FREE and EXCLUSIVE. */
export const setTier = (mediaId, tier) => update(mediaId, { tier });

export const update = (mediaId, patch) => http.patch(`/me/media/${mediaId}`, patch);

export const remove = (mediaId) => http.del(`/me/media/${mediaId}`);

/** Path for the authed file fetch — not usable as a bare <img src>. */
export const filePath = (mediaId) => `/media/${mediaId}/file`;

/** Promote an item to the profile's primary photo. */
export const setPrimary = (mediaId) => update(mediaId, { primary: true });

export function validate(file, kind) {
  const mb = file.size / 1024 / 1024;
  if (kind === 'video') {
    if (!file.type.startsWith('video/')) return 'Choose a video file.';
    if (mb > UPLOAD_LIMITS.videoMb) return `Videos must be under ${UPLOAD_LIMITS.videoMb} MB.`;
  } else {
    if (!file.type.startsWith('image/')) return 'Choose an image file.';
    if (mb > UPLOAD_LIMITS.photoMb) return `Photos must be under ${UPLOAD_LIMITS.photoMb} MB.`;
  }
  return null;
}
