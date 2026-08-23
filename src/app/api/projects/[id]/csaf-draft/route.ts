import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject, assertProjectWriteAccess } from '@/lib/access';

interface RouteContext { params: Promise<{ id: string }> }

const VALID_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const VALID_TLP = ['WHITE', 'GREEN', 'AMBER', 'RED'] as const;
const VALID_PUB_CATEGORIES = ['vendor', 'coordinator', 'discoverer', 'other'] as const;

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'Pro license required.' }, { status: 403 });

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const [draft, userProfile] = await Promise.all([
    prisma.csafDraft.findUnique({ where: { projectId } }),
    prisma.user.findUnique({
      where: { id: authResult.userId },
      select: {
        csafPublisherName: true, csafPublisherNamespace: true,
        csafPublisherCategory: true, csafIssuingAuthority: true, csafContactDetails: true,
        companyName: true,
      },
    }),
  ]);

  // Also fetch triage progress so the wizard gate can show it
  const vulns = await prisma.projectVulnerability.findMany({
    where: { projectId },
    select: { status: true, severity: true },
  });
  const total = vulns.length;
  const open = vulns.filter((v) => v.status === 'open').length;

  // Derive aggregate severity from the highest non-not_affected vuln
  const active = vulns.filter((v) => v.status !== 'not_affected');
  const RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
  const topSev = active.reduce((acc, v) => {
    return (RANK[v.severity ?? 'NONE'] ?? 0) > (RANK[acc] ?? 0) ? (v.severity ?? 'NONE') : acc;
  }, 'NONE');
  const derivedSeverity = topSev === 'NONE' ? 'MEDIUM' : topSev;

  return NextResponse.json({
    draft: draft ? {
      title: draft.title,
      trackingId: draft.trackingId,
      version: draft.version,
      revision: draft.revision,
      docStatus: draft.docStatus,
      aggregateSeverity: draft.aggregateSeverity,
      initialReleaseDate: draft.initialReleaseDate.toISOString(),
      currentReleaseDate: draft.currentReleaseDate.toISOString(),
      tlp: draft.tlp,
      summary: draft.summary,
      details: draft.details,
      publisherName: draft.publisherName,
      publisherNamespace: draft.publisherNamespace,
      publisherCategory: draft.publisherCategory,
    } : null,
    triage: { total, open, derivedSeverity },
    // User's saved publisher profile - used to pre-fill the wizard when no draft exists yet
    publisherProfile: {
      name: userProfile?.csafPublisherName ?? userProfile?.companyName ?? '',
      namespace: userProfile?.csafPublisherNamespace ?? '',
      category: userProfile?.csafPublisherCategory ?? 'vendor',
      issuingAuthority: userProfile?.csafIssuingAuthority ?? '',
      contactDetails: userProfile?.csafContactDetails ?? '',
    },
  });
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'Pro license required.' }, { status: 403 });

  const { id: projectId } = await ctx.params;
  try {
    await assertProjectWriteAccess(projectId, authResult.userId);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate and sanitise each field individually - partial updates are OK
  const data: Parameters<typeof prisma.csafDraft.upsert>[0]['create'] = { projectId } as never;

  if (typeof body.title === 'string') (data as Record<string, unknown>).title = body.title.trim().slice(0, 256);
  if (typeof body.trackingId === 'string') (data as Record<string, unknown>).trackingId = body.trackingId.trim().slice(0, 128);
  if (typeof body.version === 'string') (data as Record<string, unknown>).version = body.version.trim().slice(0, 32);
  if (typeof body.revision === 'string') (data as Record<string, unknown>).revision = body.revision.trim().slice(0, 256);
  if (typeof body.docStatus === 'string' && (VALID_STATUSES as readonly string[]).includes(body.docStatus)) (data as Record<string, unknown>).docStatus = body.docStatus;
  if (typeof body.aggregateSeverity === 'string' && (VALID_SEVERITIES as readonly string[]).includes(body.aggregateSeverity)) (data as Record<string, unknown>).aggregateSeverity = body.aggregateSeverity;
  if (typeof body.tlp === 'string' && (VALID_TLP as readonly string[]).includes(body.tlp)) (data as Record<string, unknown>).tlp = body.tlp;
  if (typeof body.summary === 'string') (data as Record<string, unknown>).summary = body.summary.trim().slice(0, 4096);
  if (typeof body.details === 'string') (data as Record<string, unknown>).details = body.details.trim().slice(0, 16384);
  if (typeof body.publisherName === 'string') (data as Record<string, unknown>).publisherName = body.publisherName.trim().slice(0, 256);
  if (typeof body.publisherNamespace === 'string') (data as Record<string, unknown>).publisherNamespace = body.publisherNamespace.trim().slice(0, 512);
  if (typeof body.publisherCategory === 'string' && (VALID_PUB_CATEGORIES as readonly string[]).includes(body.publisherCategory)) (data as Record<string, unknown>).publisherCategory = body.publisherCategory;
  if (typeof body.initialReleaseDate === 'string') {
    const d = new Date(body.initialReleaseDate);
    if (!isNaN(d.getTime())) (data as Record<string, unknown>).initialReleaseDate = d;
  }
  if (typeof body.currentReleaseDate === 'string') {
    const d = new Date(body.currentReleaseDate);
    if (!isNaN(d.getTime())) (data as Record<string, unknown>).currentReleaseDate = d;
  }

  const draft = await prisma.csafDraft.upsert({
    where: { projectId },
    create: { projectId, ...data as object },
    update: data as object,
  });

  return NextResponse.json({ ok: true, updatedAt: draft.updatedAt.toISOString() });
}
