import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canAccessProject, assertProjectWriteAccess } from '@/lib/access';
import { resolveEvidencePath, sanitizeFilename } from '@/lib/documentsStorage';
import fs from 'fs/promises';

const MIME_CONTENT_TYPES: Record<string, string> = {
  'application/pdf': 'application/pdf',
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain': 'text/plain; charset=utf-8',
  'text/xml': 'text/xml; charset=utf-8',
  'application/xml': 'application/xml',
};

interface Params { params: Promise<{ id: string; evidenceId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { evidenceId } = await params;

  const record = await prisma.measureEvidence.findUnique({
    where: { id: evidenceId },
    select: { id: true, name: true, storagePath: true, mimeType: true, projectId: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const hasAccess = await canAccessProject(record.projectId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  let absPath: string;
  try {
    absPath = resolveEvidencePath(record.storagePath);
  } catch {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 500 });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(absPath);
  } catch {
    return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
  }

  const contentType = MIME_CONTENT_TYPES[record.mimeType] ?? 'application/octet-stream';
  const encodedName = encodeURIComponent(sanitizeFilename(record.name));
  const isDownload = req.nextUrl.searchParams.get('download') === '1';
  const disposition = isDownload
    ? `attachment; filename*=UTF-8''${encodedName}`
    : `inline; filename*=UTF-8''${encodedName}`;

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Content-Length': String(fileBuffer.length),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { evidenceId } = await params;

  const record = await prisma.measureEvidence.findUnique({
    where: { id: evidenceId },
    select: { id: true, storagePath: true, projectId: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    await assertProjectWriteAccess(record.projectId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  await prisma.measureEvidence.delete({ where: { id: evidenceId } });

  try {
    const absPath = resolveEvidencePath(record.storagePath);
    await fs.unlink(absPath);
  } catch {
    // file already gone - acceptable
  }

  return new NextResponse(null, { status: 204 });
}
