import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';
import { loadFindings } from '@/lib/findings';
import { resolveCiVersion } from '@/lib/ciVersion';

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

  // ?version=N for a specific version, default = active
  const version = await resolveCiVersion(projectId, new URL(req.url).searchParams.get('version'));
  if (!version) return NextResponse.json({ sbom: null, vulnerabilities: [], version: null });
  const versionId = version.id;
  const versionNumber = version.number;

  // A version can hold one SBOM per part (CI uploads for multi-part products);
  // findings of all parts are listed together, the metadata shown is the newest SBOM.
  const sboms = await prisma.projectSbom.findMany({
    where: { versionId },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, fileName: true, format: true, part: true, componentCount: true, uploadedAt: true },
  });
  const sbom = sboms[0] ?? null;
  if (!sbom) {
    return NextResponse.json({ sbom: null, vulnerabilities: [], version: { id: versionId, number: versionNumber } });
  }
  const vulnerabilities = await loadFindings({ versionIds: [versionId] });

  return NextResponse.json({
    version: { id: versionId, number: versionNumber },
    sbom: {
      id: sbom.id,
      fileName: sbom.fileName,
      format: sbom.format,
      componentCount: sboms.reduce((n, x) => n + x.componentCount, 0),
      parts: sboms.map((x) => x.part).filter(Boolean),
      uploadedAt: sbom.uploadedAt.toISOString(),
    },
    vulnerabilities: vulnerabilities.map((v) => ({
      id: v.id,
      osvId: v.osvId,
      cveId: v.cveId,
      summary: v.summary,
      severity: v.severity,
      cvssScore: v.cvssScore,
      epss: v.epss,
      fixed: v.fixed,
      componentName: v.componentName,
      componentVersion: v.componentVersion,
      componentPurl: v.componentPurl,
      status: v.status,
      suppressed: v.suppressed,
      exploited: v.kevAddedAt !== null,
      justification: v.justification,
      remediationCategory: v.remediationCategory,
      remediationDetails: v.remediationDetails,
      remediationUrl: v.remediationUrl,
      updatedAt: (v.updatedAt ?? v.firstSeenAt).toISOString(),
    })),
  });
}
