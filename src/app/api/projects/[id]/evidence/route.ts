import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectWriteAccess } from '@/lib/access';
import {
  resolveEvidencePath,
  MAX_EVIDENCE_SIZE,
  MAX_EVIDENCE_PER_MEASURE,
  EVIDENCE_ALLOWED_MIMES,
  sanitizeFilename,
} from '@/lib/documentsStorage';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: projectId } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const diagramId = formData.get('diagramId');
  const measureId = formData.get('measureId');
  const file = formData.get('file');

  if (typeof diagramId !== 'string' || !diagramId.trim()) {
    return NextResponse.json({ error: 'Missing diagramId' }, { status: 400 });
  }
  if (typeof measureId !== 'string' || !measureId.trim()) {
    return NextResponse.json({ error: 'Missing measureId' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  try {
    await assertProjectWriteAccess(projectId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const mimeType = file.type || 'application/octet-stream';
  const ext = EVIDENCE_ALLOWED_MIMES[mimeType];
  if (!ext) {
    return NextResponse.json(
      { error: 'File type not allowed. Accepted: PDF, PNG, JPG, XLSX, TXT, XML' },
      { status: 400 },
    );
  }

  if (file.size > MAX_EVIDENCE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }

  const existingCount = await prisma.measureEvidence.count({
    where: { diagramId, measureId },
  });
  if (existingCount >= MAX_EVIDENCE_PER_MEASURE) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_EVIDENCE_PER_MEASURE} files per measure reached` },
      { status: 422 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const displayName = sanitizeFilename(file.name || `evidence.${ext}`);
  const uuid = crypto.randomUUID();
  const storagePath = `${projectId}/${uuid}.${ext}`;
  const absPath = resolveEvidencePath(storagePath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, bytes, { mode: 0o640 });

  const record = await prisma.measureEvidence.create({
    data: { projectId, diagramId, measureId, name: displayName, storagePath, mimeType, size: bytes.length },
    select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
  });

  return NextResponse.json(record, { status: 201 });
}
