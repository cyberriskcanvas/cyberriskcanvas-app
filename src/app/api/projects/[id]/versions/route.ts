import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { canAccessProject } from '@/lib/access';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const versions = await prisma.projectVersion.findMany({
    where: { projectId },
    orderBy: { number: 'asc' },
    select: {
      id: true, number: true, label: true, status: true,
      frozenAt: true, frozenByName: true, createdAt: true,
      _count: { select: { sboms: true, vulnerabilities: true } },
    },
  });

  return NextResponse.json(versions.map((v) => ({
    id: v.id,
    number: v.number,
    label: v.label,
    status: v.status,
    frozenAt: v.frozenAt?.toISOString() ?? null,
    frozenByName: v.frozenByName,
    createdAt: v.createdAt.toISOString(),
    sbomCount: v._count.sboms,
    vulnCount: v._count.vulnerabilities,
  })));
}
