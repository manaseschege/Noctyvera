import { http, pageQuery } from './http';

/**
 * Staff surfaces — ADMIN, and MODERATOR for the review queues.
 *
 * KYC
 *   GET  /admin/kyc/queue            pending submissions (paged)
 *   GET  /admin/kyc/queue/count      badge count
 *   GET  /admin/kyc                  all submissions, filterable by status
 *   GET  /admin/kyc/{id}             one submission, with document refs
 *   GET  /admin/kyc/documents/{id}/file   the document image itself
 *   POST /admin/kyc/{id}/review      { approve, rejectionReason?, reviewerNotes? }
 *
 * Media
 *   GET  /admin/media/queue          items awaiting moderation
 *   POST /admin/media/{id}/review    { approve, rejectionReason? }
 *
 * Billing
 *   GET  /admin/billing/purchases/pending
 *   POST /admin/billing/purchases/{id}/settle   mark a manual payment received
 *   POST /admin/billing/purchases/{id}/fail
 *   POST /admin/billing/grants                  comp an entitlement
 */

/* ── KYC ───────────────────────────────────────────────────────── */

export async function kycQueue({ page = 0, size = 20 } = {}) {
  const res = await http.get(`/admin/kyc/queue?${pageQuery({ page, size })}`);
  return { items: res.content ?? [], total: res.totalElements ?? 0, last: res.last ?? true };
}

export const kycQueueCount = () => http.get('/admin/kyc/queue/count');

/** All submissions regardless of status — filtering is client-side. */
export async function kycAll({ page = 0, size = 50 } = {}) {
  const res = await http.get(`/admin/kyc?${pageQuery({ page, size })}`);
  return { items: res.content ?? [], total: res.totalElements ?? 0, last: res.last ?? true };
}

export const kycDetail = (submissionId) => http.get(`/admin/kyc/${submissionId}`);

/** Signed URL for a KYC document image — private bucket, staff only. */
export const kycDocumentPath = (documentId) => `/admin/kyc/documents/${documentId}/file`;

export const reviewKyc = (submissionId, { approve, rejectionReason, reviewerNotes }) =>
  http.post(`/admin/kyc/${submissionId}/review`, { approve, rejectionReason, reviewerNotes });

/* ── Media moderation ─────────────────────────────────────────────
 * Posts go live immediately now. Moderation is after the fact: staff
 * review the recent feed and take individual items down.
 * ----------------------------------------------------------------- */

export async function recentMedia({ page = 0, size = 24 } = {}) {
  const res = await http.get(`/admin/media/recent?${pageQuery({ page, size })}`);
  return { items: res.content ?? [], total: res.totalElements ?? 0, last: res.last ?? true };
}

export const takenDownCount = () => http.get('/admin/media/taken-down/count');

export const takeDownMedia = (mediaId, reason) =>
  http.post(`/admin/media/${mediaId}/takedown?reason=${encodeURIComponent(reason)}`);

export const restoreMedia = (mediaId) => http.post(`/admin/media/${mediaId}/restore`);

/* ── Billing ───────────────────────────────────────────────────── */

export async function pendingPurchases({ page = 0, size = 20 } = {}) {
  const res = await http.get(`/admin/billing/purchases/pending?${pageQuery({ page, size })}`);
  return { items: res.content ?? [], total: res.totalElements ?? 0, last: res.last ?? true };
}

export const pendingPurchaseCount = () => http.get('/admin/billing/purchases/pending/count');

export const settlePurchase = (purchaseId) => http.post(`/admin/billing/purchases/${purchaseId}/settle`);

export const failPurchase = (purchaseId) => http.post(`/admin/billing/purchases/${purchaseId}/fail`);

/**
 * Grant an entitlement without a payment (comp, support gesture, test).
 * Params go on the query string, not in a body.
 *   viewerId  who receives the access
 *   targetId  whose profile is unlocked (omit for a blanket subscription)
 *   duration  ISO-8601, e.g. PT720H
 */
export const grant = ({ viewerId, targetId, duration }) => {
  const q = new URLSearchParams();
  if (viewerId) q.set('viewerId', viewerId);
  if (targetId) q.set('targetId', targetId);
  if (duration) q.set('duration', duration);
  return http.post(`/admin/billing/grants?${q}`);
};
