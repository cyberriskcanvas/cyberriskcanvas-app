'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTier } from '@/lib/tierLimits';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { getOrg } from '@/lib/organisationStore';
import { loadJourneyData } from '@/lib/journeyData';
import { productGate } from '@/pro/server';
import { sanitizeDismissed } from '@/lib/modelCheckDismissed';
import { sanitizeCraChecklist } from '@/lib/craChecklist';
import { sanitizeReadiness } from '@/lib/readiness';
import { sanitizeSdlChecklist } from '@/lib/sdlChecklist';
import { sanitizeSecurityTxt } from '@/lib/organisation';
import { READINESS_QUESTIONS } from '@/data/readinessQuestions';
import { TR03185_REQUIREMENTS } from '@/data/tr03185';
import { applyDismissals, checkModel } from '@/utils/modelCheck';
import { daysUntilSupportEnd, deriveJourney } from '@/utils/deriveJourney';
import { deriveOrgStations, type OrgStation } from '@/utils/orgJourney';
import { summarizeProduct, type ProductSummary } from '@/utils/portfolio';
import type { DiagramEdge, DiagramNode } from '@/types';
import { visibleProjectIds } from './projects';

export interface PortfolioRow {
  projectId: string;
  diagramId: string | null;
  name: string;
  teamName: string | null;
  craClass: string | null;
  versionNumber: number | null;
  /** Label of the newest frozen version, i.e. the last release. */
  lastRelease: string | null;
  summary: ProductSummary;
}

export interface Portfolio {
  org: OrgStation[];
  rows: PortfolioRow[];
  /** Gate and findings need the Pro licence. */
  pro: boolean;
}

const SDL_IDS: ReadonlySet<string> = new Set(TR03185_REQUIREMENTS.map((r) => r.id));
const ORG_QUESTION_IDS = READINESS_QUESTIONS.filter((q) => q.scope === 'org').map((q) => q.id);

/** Roadmap progress, release gate, findings, Art. 14 cases and support end of every product the user can see, plus the organisation's own roadmap. */
export async function getPortfolio(): Promise<Portfolio> {
  const session = await requireSession();
  const ids = await visibleProjectIds(session.user.id);
  const pro = !!TIER_CONFIG[await getTier()].sbom;

  const [projects, org, orgReadiness] = await Promise.all([
    prisma.project.findMany({
      where: ids !== null ? { id: { in: ids } } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, craClass: true, modelCheckDismissed: true, gateFailOn: true,
        team: { select: { name: true } },
        diagrams: { select: { id: true, nodes: true, edges: true }, orderBy: { createdAt: 'asc' }, take: 1 },
        versions: { orderBy: { number: 'desc' }, select: { id: true, number: true, label: true, status: true } },
      },
    }),
    getOrg(),
    prisma.orgReadiness.findUnique({ where: { id: 'org' } }),
  ]);

  const orgStations = deriveOrgStations({
    name: org.name, publisherName: org.publisherName, publisherNamespace: org.publisherNamespace, contactDetails: org.contactDetails,
    securityTxt: sanitizeSecurityTxt(org.securityTxt), checklist: sanitizeCraChecklist(org.craChecklist), sdl: sanitizeSdlChecklist(org.sdlChecklist, SDL_IDS),
    sdlTotal: TR03185_REQUIREMENTS.length, readiness: sanitizeReadiness(orgReadiness?.answers), readinessQuestionIds: ORG_QUESTION_IDS,
  });

  // ponytail: one query set per product, fine for small teams; cache or materialise when lists grow to hundreds
  const rows = await Promise.all(projects.map(async (p): Promise<PortfolioRow> => {
    const active = p.versions.find((v) => v.status === 'active');
    const diagram = p.diagrams[0];
    const nodes = (diagram?.nodes ?? []) as unknown as DiagramNode[];
    const edges = (diagram?.edges ?? []) as unknown as DiagramEdge[];

    const gate = pro && active ? await productGate(active.id, p.gateFailOn) : null;
    const ciLatest = gate?.ciLatest ?? null;
    const gateReasons = gate?.gateReasons ?? null;
    const gatePass = gate?.gatePass ?? null;
    const openHigh = gate?.openHigh ?? null;

    const data = await loadJourneyData(p.id);
    const modelFindings = applyDismissals(
      checkModel({ nodes, edges, decidedRequirements: new Set(Object.keys(data.checklist)) }),
      sanitizeDismissed(p.modelCheckDismissed),
    ).open;
    const stations = deriveJourney({ nodes, ciLatest, gateReasons, data, modelFindings });

    return {
      projectId: p.id,
      diagramId: diagram?.id ?? null,
      name: p.name,
      teamName: p.team?.name ?? null,
      craClass: p.craClass,
      versionNumber: active?.number ?? null,
      lastRelease: p.versions.find((v) => v.status === 'frozen')?.label || null,
      summary: summarizeProduct({
        stations, gatePass, openHigh, incidents: data.incidents ?? { open: 0, overdue: 0 },
        supportDays: daysUntilSupportEnd(data.supportPeriodEnd), assessment: data.assessment ?? 'none',
      }),
    };
  }));

  return { org: orgStations, rows, pro };
}
