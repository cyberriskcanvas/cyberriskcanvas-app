import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { assertProjectWriteAccess } from '@/lib/access';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { resolveStoragePath, MAX_PDF_SIZE, MAX_DOCS_PER_PROJECT, sanitizeFilename } from '@/lib/documentsStorage';
import { audit } from '@/lib/audit';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].documents) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const projectId = formData.get('projectId');
  const file = formData.get('file');

  if (typeof projectId !== 'string' || !projectId.trim()) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  try {
    await assertProjectWriteAccess(projectId, authResult.userId);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const docCount = await prisma.projectDocument.count({ where: { projectId } });
  if (docCount >= MAX_DOCS_PER_PROJECT) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_DOCS_PER_PROJECT} documents per project reached` },
      { status: 422 },
    );
  }

  if (file.size > MAX_PDF_SIZE) return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 413 });
  if (file.size === 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 4 || !bytes.subarray(0, 4).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: 'File is not a valid PDF' }, { status: 400 });
  }

  const rawName = file.name || 'document.pdf';
  const displayName = sanitizeFilename(rawName.endsWith('.pdf') ? rawName : rawName + '.pdf');

  const uuid = crypto.randomUUID();
  const storagePath = `${projectId}/${uuid}.pdf`;
  const absPath = resolveStoragePath(storagePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, bytes, { mode: 0o640 });

  const doc = await prisma.projectDocument.create({
    data: { projectId, name: displayName, storagePath, size: bytes.length },
    select: { id: true, name: true, size: true, createdAt: true },
  });

  audit({
    action: 'document.upload',
    actorId: authResult.userId,
    targetType: 'document',
    targetId: doc.id,
    details: { projectId, name: doc.name, size: doc.size },
  });

  return NextResponse.json(doc, { status: 201 });
}
