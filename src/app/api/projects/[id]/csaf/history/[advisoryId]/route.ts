import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { canAccessProject } from '@/lib/access';

interface RouteContext { params: Promise<{ id: string; advisoryId: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id: projectId, advisoryId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const advisory = await prisma.csafAdvisory.findFirst({
    where: { id: advisoryId, projectId },
    select: { id: true, content: true, createdAt: true },
  });

  if (!advisory) return NextResponse.json({ error: 'Advisory not found' }, { status: 404 });

  return NextResponse.json({
    id: advisory.id,
    createdAt: advisory.createdAt.toISOString(),
    content: advisory.content,
  });
}
