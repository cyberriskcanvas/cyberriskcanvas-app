import path from 'path';

export {
  MAX_PDF_SIZE,
  MAX_DOCS_PER_PROJECT,
  MAX_EVIDENCE_SIZE,
  MAX_EVIDENCE_PER_MEASURE,
  EVIDENCE_ALLOWED_MIMES,
} from './uploadLimits';

const DEFAULT_DIR = process.env.NODE_ENV === 'production' ? '/data/documents' : path.join(process.cwd(), 'data', 'documents');
const DEFAULT_EVIDENCE_DIR = process.env.NODE_ENV === 'production' ? '/data/evidence' : path.join(process.cwd(), 'data', 'evidence');

export const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR ?? DEFAULT_DIR;
export const EVIDENCE_DIR = process.env.EVIDENCE_DIR ?? DEFAULT_EVIDENCE_DIR;

/** Returns absolute path for a stored document given its storagePath. */
export function resolveStoragePath(storagePath: string): string {
  // storagePath is always "<projectId>/<uuid>.pdf" - no user input in it
  const abs = path.join(/*turbopackIgnore: true*/ DOCUMENTS_DIR, storagePath);
  // Extra guard: ensure the resolved path stays within DOCUMENTS_DIR
  if (!abs.startsWith(path.resolve(/*turbopackIgnore: true*/ DOCUMENTS_DIR) + path.sep)) {
    throw new Error('Invalid storage path');
  }
  return abs;
}

/** Returns absolute path for a stored evidence file given its storagePath. */
export function resolveEvidencePath(storagePath: string): string {
  const abs = path.join(/*turbopackIgnore: true*/ EVIDENCE_DIR, storagePath);
  if (!abs.startsWith(path.resolve(/*turbopackIgnore: true*/ EVIDENCE_DIR) + path.sep)) {
    throw new Error('Invalid storage path');
  }
  return abs;
}

/** Sanitize a user-supplied filename for safe display. Strips path chars. */
export function sanitizeFilename(raw: string): string {
  return raw
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 200)
    .trim() || 'document.pdf';
}
