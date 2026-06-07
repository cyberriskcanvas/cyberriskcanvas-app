import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';

interface RouteContext { params: Promise<{ id: string }> }

// ─── CSAF 2.0 status vocabulary ───────────────────────────────────────────────

const CSAF_STATUS_MAP: Record<string, string> = {
  DRAFT: 'draft', REVIEW: 'interim', PUBLISHED: 'final', ARCHIVED: 'final',
};

const CSAF_PRODUCT_STATUS_MAP: Record<string, string> = {
  open: 'under_investigation',
  in_triage: 'under_investigation',
  not_affected: 'known_not_affected',
  fixed: 'fixed',
};

// ─── CycloneDX VEX 1.4 ────────────────────────────────────────────────────────

function buildVex(
  projectName: string,
  vulns: Array<{
    osvId: string; cveId: string | null; summary: string | null;
    severity: string | null; cvssScore: number | null;
    componentName: string; componentVersion: string | null; componentPurl: string | null;
    status: string; justification: string | null;
  }>,
) {
  const VEX_STATE: Record<string, string> = {
    open: 'in_triage', in_triage: 'in_triage', not_affected: 'not_affected', fixed: 'resolved',
  };
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    version: 1,
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'CyberRisk Canvas', name: 'Operations Module', version: '1.0' }],
      component: { type: 'application', name: projectName },
    },
    vulnerabilities: vulns.map((v) => ({
      id: v.cveId ?? v.osvId,
      source: { url: `https://osv.dev/vulnerability/${v.osvId}`, name: 'OSV' },
      ratings: v.cvssScore !== null ? [{ score: v.cvssScore, severity: (v.severity ?? 'unknown').toLowerCase(), method: 'CVSSv3' }] : [],
      description: v.summary ?? undefined,
      analysis: {
        state: VEX_STATE[v.status] ?? 'in_triage',
        ...(v.justification ? { detail: v.justification } : {}),
      },
      affects: v.componentPurl
        ? [{ ref: v.componentPurl, versions: v.componentVersion ? [{ version: v.componentVersion }] : [] }]
        : [{ ref: v.componentName }],
    })),
  };
}

// ─── CSAF 2.0 full advisory builder ───────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildCsaf(
  draft: {
    title: string; trackingId: string; version: string; revision: string;
    docStatus: string; aggregateSeverity: string;
    initialReleaseDate: Date; currentReleaseDate: Date;
    tlp: string; summary: string; details: string;
    publisherName: string; publisherNamespace: string; publisherCategory: string;
  },
  vulns: Array<{
    osvId: string; cveId: string | null; summary: string | null;
    severity: string | null; cvssScore: number | null;
    componentName: string; componentVersion: string | null;
    status: string; justification: string | null;
  }>,
) {
  const now = new Date().toISOString();

  // Build de-duplicated product list from non-"not_affected" vulns
  const productMap = new Map<string, { name: string; version: string; productId: string }>();
  for (const v of vulns) {
    if (v.status === 'not_affected') continue;
    const ver = v.componentVersion ?? 'unknown';
    const productId = `${slugify(v.componentName)}-${slugify(ver)}`;
    if (!productMap.has(productId)) {
      productMap.set(productId, { name: v.componentName, version: ver, productId });
    }
  }
  const products = [...productMap.values()];

  // Group products by name for the hierarchical product_tree
  const byName = new Map<string, typeof products>();
  for (const p of products) {
    const list = byName.get(p.name) ?? [];
    list.push(p);
    byName.set(p.name, list);
  }

  const vendorName = draft.publisherName || 'Unknown';

  return {
    document: {
      category: 'csaf_vex',
      csaf_version: '2.0',
      lang: 'en',
      title: draft.title,
      publisher: {
        category: draft.publisherCategory || 'vendor',
        name: draft.publisherName || 'Unknown',
        namespace: draft.publisherNamespace || 'https://example.com',
        ...(draft.publisherName ? { issuing_authority: draft.publisherName } : {}),
      },
      tracking: {
        id: draft.trackingId || `advisory-${Date.now()}`,
        aliases: [draft.trackingId || `advisory-${Date.now()}`],
        status: CSAF_STATUS_MAP[draft.docStatus] ?? 'draft',
        version: draft.version || '1',
        initial_release_date: draft.initialReleaseDate.toISOString(),
        current_release_date: draft.currentReleaseDate.toISOString(),
        revision_history: [
          {
            number: draft.version || '1',
            summary: draft.revision || 'Initial release',
            date: now,
          },
        ],
      },
      distribution: { tlp: { label: draft.tlp || 'WHITE' } },
      aggregate_severity: { text: draft.aggregateSeverity || 'MEDIUM' },
      notes: [
        { category: 'summary', title: 'Summary', text: draft.summary || draft.title },
        ...(draft.details ? [{ category: 'description', title: 'Impact', text: draft.details }] : []),
      ],
    },
    product_tree: products.length > 0 ? {
      branches: [
        {
          category: 'vendor',
          name: vendorName,
          branches: [...byName.entries()].map(([name, versions]) => ({
            category: 'product_name',
            name,
            branches: versions.map((p) => ({
              category: 'product_version',
              name: p.version,
              product: { name: `${p.name} ${p.version}`, product_id: p.productId },
            })),
          })),
        },
      ],
    } : { branches: [] },
    vulnerabilities: vulns.map((v) => {
      const ver = v.componentVersion ?? 'unknown';
      const productId = `${slugify(v.componentName)}-${slugify(ver)}`;
      const csafStatus = CSAF_PRODUCT_STATUS_MAP[v.status] ?? 'under_investigation';
      const entry: Record<string, unknown> = {
        ...(v.cveId ? { cve: v.cveId } : { ids: [{ system_name: 'OSV', text: v.osvId }] }),
        title: v.cveId ?? v.osvId,
        notes: [{ category: 'summary', title: 'Vulnerability Summary', text: v.summary ?? v.osvId }],
        product_status: { [csafStatus]: [productId] },
      };
      if (v.justification) {
        entry.remediations = [{ category: 'none_available', details: v.justification, product_ids: [productId] }];
      }
      return entry;
    }),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'Pro license required.' }, { status: 403 });

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const [project, draft, vulns] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    prisma.csafDraft.findUnique({ where: { projectId } }),
    prisma.projectVulnerability.findMany({
      where: { projectId },
      orderBy: [{ severity: 'asc' }, { cveId: 'asc' }],
    }),
  ]);

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (vulns.length === 0) return NextResponse.json({ error: 'No vulnerabilities found. Upload an SBOM first.' }, { status: 404 });

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
    tlp: 'WHITE',
    summary: `Security advisory for ${project.name}.`,
    details: '',
    publisherName: '',
    publisherNamespace: '',
    publisherCategory: 'vendor',
  };

  const vex = buildVex(project.name, vulns);
  const csaf = buildCsaf(effectiveDraft, vulns);

  return NextResponse.json({ vex, csaf, projectName: project.name });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'Pro license required.' }, { status: 403 });

  const { id: projectId } = await ctx.params;
  if (!await canAccessProject(projectId, authResult.userId)) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = await req.json();
  if (!body?.csaf) return NextResponse.json({ error: 'Missing csaf payload' }, { status: 400 });

  const advisory = await prisma.csafAdvisory.create({
    data: { projectId, content: body.csaf as unknown as never },
  });

  return NextResponse.json({ id: advisory.id, createdAt: advisory.createdAt.toISOString() });
}
