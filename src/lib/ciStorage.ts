import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { resolveStoragePath } from './documentsStorage';

export const MAX_CI_FILE_SIZE = 25 * 1024 * 1024;

/** Stores an uploaded CI result under DOCUMENTS_DIR/ci/<projectId>/ (a mounted volume). */
export async function saveCiFile(projectId: string, content: Buffer, ext: 'json' | 'xml' = 'json') {
  const storagePath = `ci/${projectId}/${randomUUID()}.${ext}`;
  const abs = resolveStoragePath(storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content);
  return { storagePath, size: content.length, sha256: createHash('sha256').update(content).digest('hex') };
}

export function readCiFile(storagePath: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storagePath));
}
