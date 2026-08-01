import { http, pageQuery } from './http';

/**
 * Following a creator.
 *
 * Free, one-directional, no approval, and it grants access to nothing. Its
 * purpose is reminders: a follower is emailed shortly before each of her
 * scheduled broadcasts.
 */

export const follow = (userId, remind = true) =>
  http.post(`/members/${userId}/follow?remind=${remind}`);

export const unfollow = (userId) => http.del(`/members/${userId}/follow`);

export const following = ({ page = 0, size = 30 } = {}) =>
  http.get(`/me/following?${pageQuery({ page, size })}`);
