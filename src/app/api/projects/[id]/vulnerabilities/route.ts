import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].sbom) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Resolve version: ?version=N for a specific frozen version, default = active
  const url = new URL(req.url);
  const versionParam = url.searchParams.get('version');

  let versionId: string | null = null;
  let versionNumber: number | null = null;

  if (versionParam) {
    const num = parseInt(versionParam, 10);
    if (!isNaN(num)) {
      const v = await prisma.projectVersion.findUnique({
        where: { projectId_number: { projectId, number: num } },
        select: { id: true, number: true, status: true },
      });
      if (!v) return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
      versionId = v.id;
      versionNumber = v.number;
    }
  } else {
    const v = await prisma.projectVersion.findFirst({
      where: { projectId, status: 'active' },
      orderBy: { number: 'desc' },
      select: { id: true, number: true, status: true },
    });
    versionId = v?.id ?? null;
    versionNumber = v?.number ?? null;
  }

  if (!versionId) {
    return NextResponse.json({ sbom: null, vulnerabilities: [], version: null });
  }

  const sbom = await prisma.projectSbom.findFirst({
    where: { versionId },
    orderBy: { uploadedAt: 'desc' },
    include: { vulnerabilities: { orderBy: [{ severity: 'asc' }, { cveId: 'asc' }] } },
  });

  if (!sbom) {
    return NextResponse.json({ sbom: null, vulnerabilities: [], version: { id: versionId, number: versionNumber } });
  }

  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
  const sorted = [...sbom.vulnerabilities].sort(
    (a, b) => (severityOrder[a.severity ?? 'NONE'] ?? 5) - (severityOrder[b.severity ?? 'NONE'] ?? 5),
  );

  return NextResponse.json({
    version: { id: versionId, number: versionNumber },
    sbom: {
      id: sbom.id,
      fileName: sbom.fileName,
      format: sbom.format,
      componentCount: sbom.componentCount,
      uploadedAt: sbom.uploadedAt.toISOString(),
    },
    vulnerabilities: sorted.map((v) => ({
      id: v.id,
      osvId: v.osvId,
      cveId: v.cveId,
      summary: v.summary,
      severity: v.severity,
      cvssScore: v.cvssScore,
      componentName: v.componentName,
      componentVersion: v.componentVersion,
      componentPurl: v.componentPurl,
      status: v.status,
      justification: v.justification,
      updatedAt: v.updatedAt.toISOString(),
    })),
  });
}
