import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canAccessProject, assertProjectWriteAccess } from '@/lib/access';
import { resolveStoragePath, sanitizeFilename } from '@/lib/documentsStorage';
import fs from 'fs/promises';

interface Params {
  params: Promise<{ id: string }>;
}

// ── GET /api/documents/[id] - serve PDF ───────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.projectDocument.findUnique({
    where: { id },
    select: { id: true, name: true, storagePath: true, size: true, projectId: true },
  });

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const hasAccess = await canAccessProject(doc.projectId, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  let absPath: string;
  try {
    absPath = resolveStoragePath(doc.storagePath);
  } catch {
    return NextResponse.json({ error: 'Invalid document path' }, { status: 500 });
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(absPath);
  } catch {
    return NextResponse.json({ error: 'Document file not found on server' }, { status: 404 });
  }

  // RFC 5987 encoded filename for Content-Disposition
  const encodedName = encodeURIComponent(sanitizeFilename(doc.name));
  const disposition = req.nextUrl.searchParams.get('download') === '1'
    ? `attachment; filename*=UTF-8''${encodedName}`
    : `inline; filename*=UTF-8''${encodedName}`;

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Content-Length': String(fileBuffer.length),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}

// ── DELETE /api/documents/[id] ────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.projectDocument.findUnique({
    where: { id },
    select: { id: true, storagePath: true, projectId: true },
  });

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  try {
    await assertProjectWriteAccess(doc.projectId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Delete from DB first - if file deletion fails we at least lose the reference
  await prisma.projectDocument.delete({ where: { id } });

  // Best-effort file deletion - don't fail the request if file is already gone
  try {
    const absPath = resolveStoragePath(doc.storagePath);
    await fs.unlink(absPath);
  } catch {
    // file already gone - acceptable
  }

  return new NextResponse(null, { status: 204 });
}
