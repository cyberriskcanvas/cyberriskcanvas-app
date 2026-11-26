import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'Pro license required.' }, { status: 403 });

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const advisories = await prisma.csafAdvisory.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true },
    take: 50,
  });

  return NextResponse.json(advisories.map((a) => ({
    id: a.id,
    createdAt: a.createdAt.toISOString(),
  })));
}
