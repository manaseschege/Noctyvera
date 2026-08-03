import { http, pageQuery } from './http';

/**
 * Private 1-to-1 video calls.
 *
 *   GET  /members/{id}/call-rates   her price list (public)
 *   POST /members/{id}/calls        book one, and pay
 *   GET  /me/calls                  mine, either side
 *   PUT  /me/call-rates             price a length, or withdraw it
 *   GET  /calls/{id}/room           the room, for the two participants
 *
 * The platform owns who may join, what it costs and when — not the video
 * itself. `room` returns 404 until a media provider is wired in.
 */

export const ratesOf = (userId) => http.get(`/members/${userId}/call-rates`);

export const myRates = () => http.get('/me/call-rates');

export const allowedDurations = () =>
  http.get('/me/call-rates/durations').then((r) => r.durations ?? []);

/** A null price withdraws that length rather than deleting it. */
export const setRate = (durationMinutes, priceMinor) =>
  http.put('/me/call-rates', { durationMinutes, priceMinor });

/**
 * Book a slot and pay for it in one step.
 *
 * The response is a CheckoutResponse like any other purchase, so on mobile
 * money the booking is held PENDING until the payer approves the prompt —
 * poll it with `billingApi.waitForSettlement`.
 */
export const book = (userId, { durationMinutes, scheduledFor, payerMsisdn }) =>
  http.post(`/members/${userId}/calls`, { durationMinutes, scheduledFor, payerMsisdn });

export const mine = ({ page = 0, size = 20 } = {}) =>
  http.get(`/me/calls?${pageQuery({ page, size })}`);

export const cancel = (callId, reason) =>
  http.del(`/calls/${callId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`);

export const room = (callId) => http.get(`/calls/${callId}/room`);
