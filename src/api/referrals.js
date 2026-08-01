import { http, pageQuery } from './http';

/**
 * Invite codes and the credit they earn.
 *
 *   GET /me/referrals          code, share link, counts, credit balance
 *   GET /me/referrals/credit   the ledger, newest first
 *
 * The bonus lands when somebody who signed up with the code buys their FIRST
 * package — not when they register. Credit is spendable on anything, and is
 * applied before the payment provider is involved, so a purchase it covers
 * entirely settles with no payment at all.
 */

export const summary = () => http.get('/me/referrals');

export const credit = ({ page = 0, size = 20 } = {}) =>
  http.get(`/me/referrals/credit?${pageQuery({ page, size })}`);
