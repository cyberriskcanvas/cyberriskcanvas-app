/**
 * Upload limits shared between server-side enforcement (lib/documentsStorage,
 * API routes) and client-side validation (DocumentsPanel). Kept in their own
 * module - without Node built-ins - so client components can import them
 * directly without pulling in server-only code.
 */

export const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
export const MAX_DOCS_PER_PROJECT = 20;

export const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_EVIDENCE_PER_MEASURE = 5;

/** MIME types accepted for evidence uploads: value is the file extension to use. */
export const EVIDENCE_ALLOWED_MIMES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/xml': 'xml',
  'application/xml': 'xml',
};
