import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { loadFindings } from '@/lib/findings';
import { getOrg } from '@/lib/organisationStore';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject, assertProjectWriteAccess } from '@/lib/access';
import { severityRank } from '@/lib/cvss';
import { CSAF_VERSIONS, PUBLISHER_CATEGORIES, TLP_LABELS, normaliseTlp } from '@/lib/csaf';

interface RouteContext { params: Promise<{ id: string }> }

const VALID_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'Pro license required.' }, { status: 403 });

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const [draft, org] = await Promise.all([
    prisma.csafDraft.findUnique({ where: { projectId } }),
    getOrg(),
  ]);

  // Also fetch triage progress so the wizard gate can show it
  const vulns = await loadFindings({ projectIds: [projectId] });
  const total = vulns.length;
  const open = vulns.filter((v) => v.status === 'open').length;

  // Derive aggregate severity from the highest non-not_affected vuln
  const active = vulns.filter((v) => v.status !== 'not_affected');
  const topSev = active.reduce((acc, v) => {
    return severityRank(v.severity) > severityRank(acc) ? (v.severity ?? 'NONE') : acc;
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
      tlp: normaliseTlp(draft.tlp),
      summary: draft.summary,
      details: draft.details,
      // the publisher is the organisation: it wins over what an older draft stored
      publisherName: org.publisherName || org.name || draft.publisherName,
      publisherNamespace: org.publisherNamespace || draft.publisherNamespace,
      publisherCategory: org.publisherName ? org.publisherCategory : draft.publisherCategory,
      csafVersion: draft.csafVersion,
      licenseExpression: draft.licenseExpression ?? '',
    } : null,
    triage: { total, open, derivedSeverity },
    // The organisation's publisher profile - used to pre-fill the wizard when no draft exists yet
    publisherProfile: {
      name: org.publisherName ?? org.name ?? '',
      namespace: org.publisherNamespace ?? '',
      category: org.publisherCategory,
      issuingAuthority: org.issuingAuthority ?? '',
      contactDetails: org.contactDetails ?? '',
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
  if (typeof body.tlp === 'string' && (TLP_LABELS as readonly string[]).includes(body.tlp)) (data as Record<string, unknown>).tlp = body.tlp;
  if (typeof body.summary === 'string') (data as Record<string, unknown>).summary = body.summary.trim().slice(0, 4096);
  if (typeof body.details === 'string') (data as Record<string, unknown>).details = body.details.trim().slice(0, 16384);
  if (typeof body.publisherName === 'string') (data as Record<string, unknown>).publisherName = body.publisherName.trim().slice(0, 256);
  if (typeof body.publisherNamespace === 'string') (data as Record<string, unknown>).publisherNamespace = body.publisherNamespace.trim().slice(0, 512);
  if (typeof body.publisherCategory === 'string' && (PUBLISHER_CATEGORIES as readonly string[]).includes(body.publisherCategory)) (data as Record<string, unknown>).publisherCategory = body.publisherCategory;
  if (typeof body.csafVersion === 'string' && (CSAF_VERSIONS as readonly string[]).includes(body.csafVersion)) (data as Record<string, unknown>).csafVersion = body.csafVersion;
  // SPDX license expression for CSAF 2.1 documents; empty string clears it
  if (typeof body.licenseExpression === 'string') (data as Record<string, unknown>).licenseExpression = body.licenseExpression.trim().slice(0, 256) || null;
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
