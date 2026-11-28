import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { canAccessProject } from '@/lib/access';
import { readCiFile } from '@/lib/ciStorage';
import { sanitizeFilename } from '@/lib/documentsStorage';

interface RouteContext { params: Promise<{ id: string; runId: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id: projectId, runId } = await ctx.params;
  if (!(await canAccessProject(projectId, authResult.userId))) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const run = await prisma.ciRun.findFirst({ where: { id: runId, projectId }, select: { fileName: true, storagePath: true } });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  let body: Buffer;
  try {
    body = await readCiFile(run.storagePath);
  } catch {
    return NextResponse.json({ error: 'File no longer available' }, { status: 410 });
  }
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': run.fileName.endsWith('.xml') ? 'application/xml' : 'application/json',
      'Content-Disposition': `attachment; filename="${sanitizeFilename(run.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
