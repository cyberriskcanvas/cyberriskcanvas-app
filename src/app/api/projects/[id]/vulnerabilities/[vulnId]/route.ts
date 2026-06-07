import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';

const VALID_STATUSES = ['open', 'in_triage', 'not_affected', 'fixed'] as const;

interface RouteContext { params: Promise<{ id: string; vulnId: string }> }

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].sbom) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const { id: projectId, vulnId } = await ctx.params;

  const hasAccess = await canAccessProject(projectId, authResult.userId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: { status?: string; justification?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { status, justification } = body;

  if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const existing = await prisma.projectVulnerability.findFirst({
    where: { id: vulnId, projectId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Vulnerability not found' }, { status: 404 });
  }

  const updated = await prisma.projectVulnerability.update({
    where: { id: vulnId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(justification !== undefined ? { justification: justification.slice(0, 2000) } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    justification: updated.justification,
    updatedAt: updated.updatedAt.toISOString(),
  });
}
