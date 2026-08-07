import { API_BASE_URL } from './config';
import { http, pageQuery } from './http';

/**
 * Public browse surface.
 *
 *   GET /members                    paged MemberCardResponse, optional ?city
 *   GET /members/{userId}/profile   full ProfileResponse
 *   GET /members/{userId}/media     MediaResponse[] (locked flag per item)
 *   GET /members/{userId}/live      that member's live sessions
 *
 * A card carries `previewPhotoUrls` (the free teaser), `lockedPhotoCount`,
 * `lockedVideoCount`, `liveNow` and `unlocked` — everything needed to sell
 * the profile without giving it away.
 */

export async function list({ city, minAge, maxAge, page = 0, size = 24, sort } = {}) {
  const q = pageQuery({ page, size, sort });
  if (city) q.set('city', city);
  // Sent only when set: an absent bound means "no limit at that end", which is
  // not the same as sending the platform minimum and would quietly exclude
  // nobody while still costing a query predicate.
  if (minAge != null) q.set('minAge', String(minAge));
  if (maxAge != null) q.set('maxAge', String(maxAge));
  const res = await http.get(`/members?${q}`);
  return {
    items: res.content ?? [],
    page: res.page ?? 0,
    size: res.size ?? size,
    total: res.totalElements ?? 0,
    totalPages: res.totalPages ?? 0,
    last: res.last ?? true,
  };
}

export const getProfile = (userId) => http.get(`/members/${userId}/profile`);

export const getMedia = (userId) => http.get(`/members/${userId}/media`);

export const getLive = (userId) => http.get(`/members/${userId}/live`);

/**
 * Streaming URL for an approved media item. Locked items have no `url`
 * from the server, so this is only ever called for unlocked ones.
 */
/** Path for the authed file fetch — not usable as a bare <img src>. */
export const filePath = (mediaId) => `/media/${mediaId}/file`;

/**
 * `previewPhotoUrls` come back already prefixed with the API base
 * (`/api/v1/media/…/file`). http.blob() prepends the base itself, so the
 * prefix has to come off or the request doubles up on it.
 * Returns null for an absolute URL — that one can be used as a src directly.
 */
export function toFetchPath(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return null;
  const path = url.startsWith('/') ? url : `/${url}`;
  return path.startsWith(API_BASE_URL) ? path.slice(API_BASE_URL.length) : path;
}

/**
 * The card's teaser image. The API renamed `previewPhotoUrls` to
 * `freePhotoUrls` when tiers landed; the old name is still accepted here so
 * a stale response doesn't blank the grid.
 */
export function coverOf(card) {
  return card?.freePhotoUrls?.[0] ?? card?.previewPhotoUrls?.[0] ?? null;
}

/** Every free item on a card — photos first, then clips. */
export function freeMediaOf(card) {
  return [...(card?.freePhotoUrls ?? []), ...(card?.freeVideoUrls ?? [])];
}

export function lockedCount(card) {
  return (card?.lockedPhotoCount ?? 0) + (card?.lockedVideoCount ?? 0);
}
