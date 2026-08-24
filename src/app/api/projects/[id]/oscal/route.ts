import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { canAccessProject } from '@/lib/access';
import { aggregateDiagram } from '@/utils/aggregateDiagram';
import { generateOscalAssessmentResults } from '@/lib/oscal';
import type { DiagramNode } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  const hasAccess = await canAccessProject(projectId, authResult.userId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      diagrams: {
        take: 1,
        orderBy: { updatedAt: 'desc' },
      },
      versions: {
        where: { status: 'active' },
        take: 1,
        orderBy: { number: 'desc' },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const latestDiagram = project.diagrams[0];
  const nodes = (latestDiagram?.nodes ?? []) as unknown as DiagramNode[];
  const summary = aggregateDiagram(nodes);

  const activeVersion = project.versions[0];
  const oscalPayload = generateOscalAssessmentResults(summary, {
    projectName: project.name,
    projectVersion: activeVersion ? `v${activeVersion.number}.0` : '1.3.0',
  });

  const cleanFilename = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${cleanFilename}-oscal-assessment-results.json`;

  return new NextResponse(JSON.stringify(oscalPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
