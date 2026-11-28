import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { loadFindings } from '@/lib/findings';
import { canAccessProject, assertProjectWriteAccess } from '@/lib/access';
import { buildCsaf, slugify, CSAF_VERSIONS, type CsafVersion } from '@/lib/csaf';
import { buildVex } from '@/lib/vex';
import { getOrg } from '@/lib/organisationStore';

interface RouteContext { params: Promise<{ id: string }> }

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const [project, draft, vulns, profile, ownVulns, versionRows] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    prisma.csafDraft.findUnique({ where: { projectId } }),
    loadFindings({ projectIds: [projectId] }),
    getOrg(),
    prisma.ownVulnerability.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } }),
    prisma.projectVersion.findMany({ where: { projectId }, select: { id: true, number: true, label: true } }),
  ]);

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (vulns.length === 0 && ownVulns.length === 0) return NextResponse.json({ error: 'No vulnerabilities found. Upload an SBOM or add an own vulnerability first.' }, { status: 404 });

  // ?version=2.0|2.1 overrides the version chosen in the draft (default 2.0, the OASIS Standard)
  const requested = new URL(req.url).searchParams.get('version');
  if (requested && !(CSAF_VERSIONS as readonly string[]).includes(requested)) {
    return NextResponse.json({ error: `version must be one of ${CSAF_VERSIONS.join(', ')}` }, { status: 400 });
  }
  const csafVersion = (requested ?? draft?.csafVersion ?? '2.0') as CsafVersion;

  // Use draft data if available, otherwise sensible defaults
  const effectiveDraft = draft ?? {
    title: `Security Advisory – ${project.name}`,
    trackingId: `${slugify(project.name)}-${new Date().getFullYear()}-001`,
    version: '1',
    revision: 'Initial release',
    docStatus: 'DRAFT',
    aggregateSeverity: 'MEDIUM',
    initialReleaseDate: new Date(),
    currentReleaseDate: new Date(),
    tlp: 'CLEAR',
    summary: `Security advisory for ${project.name}.`,
    details: '',
    publisherName: '',
    publisherNamespace: '',
    publisherCategory: 'vendor',
    licenseExpression: null,
  };

  // The publisher is the organisation, whatever an older draft stored
  const draftWithOrg = {
    ...effectiveDraft,
    publisherName: profile.publisherName || profile.name || effectiveDraft.publisherName,
    publisherNamespace: profile.publisherNamespace || effectiveDraft.publisherNamespace,
    publisherCategory: profile.publisherName ? profile.publisherCategory : effectiveDraft.publisherCategory,
  };

  const versionById = new Map(versionRows.map((v) => [v.id, v]));
  const vex = buildVex(project.name, vulns);
  const { csaf, warnings } = buildCsaf(
    draftWithOrg,
    vulns.map((v) => ({ ...v, versionNumber: versionById.get(v.versionId)?.number ?? 0, versionLabel: versionById.get(v.versionId)?.label ?? '' })),
    {
      version: csafVersion, projectName: project.name,
      contactDetails: profile.contactDetails, issuingAuthority: profile.issuingAuthority,
      versionLabels: Object.fromEntries(versionRows.map((v) => [v.number, v.label])),
    },
    ownVulns.map((o) => ({ ...o, affectedVersions: Array.isArray(o.affectedVersions) ? (o.affectedVersions as number[]) : [] })),
  );

  return NextResponse.json({ vex, csaf, csafVersion, warnings, projectName: project.name });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id: projectId } = await ctx.params;
  try {
    await assertProjectWriteAccess(projectId, authResult.userId);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json();
  if (!body?.csaf) return NextResponse.json({ error: 'Missing csaf payload' }, { status: 400 });

  const advisory = await prisma.csafAdvisory.create({
    data: { projectId, content: body.csaf as unknown as never },
  });

  return NextResponse.json({ id: advisory.id, createdAt: advisory.createdAt.toISOString() });
}
