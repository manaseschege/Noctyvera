import { UPLOAD_LIMITS } from './config';
import { http } from './http';

/**
 * Identity verification.
 *
 * The submission is a draft the user fills in over several requests:
 *   POST /me/kyc                    create/replace the draft's details
 *   POST /me/kyc/documents/{kind}   attach a file (ID_FRONT | ID_BACK |
 *                                   PASSPORT_PAGE | SELFIE)
 *   POST /me/kyc/submit             hand it to the review queue
 *
 * `readyToSubmit` and `missingDocuments` come back on every response, so
 * the wizard never has to work out which files are still outstanding.
 */

export const getSubmission = () => http.get('/me/kyc');

/** documentType, fullName, dateOfBirth (YYYY-MM-DD), countryOfIssue, documentNumber */
export const saveSubmission = (details) => http.post('/me/kyc', details);

export const uploadDocument = (kind, file) => http.upload(`/me/kyc/documents/${kind}`, file);

export const submit = () => http.post('/me/kyc/submit');

export const withdraw = () => http.post('/me/kyc/withdraw');

export const history = () => http.get('/me/kyc/history');

export function validateDocument(file) {
  const mb = file.size / 1024 / 1024;
  if (!/^image\//.test(file.type)) return 'Upload a photo of the document (JPG, PNG or WebP).';
  if (mb > UPLOAD_LIMITS.docMb) return `Documents must be under ${UPLOAD_LIMITS.docMb} MB.`;
  return null;
}
