import { prisma } from './db';
import { sanitizeCraChecklist, type CraChecklist } from './craChecklist';
import { mergeChecklist, ORG_REQUIREMENTS } from './organisation';
import { getOrg } from './organisationStore';
import { sanitizeDocData } from './docData';
import { incidentCounts } from '@/pro/server';
import { generateAnnexII, generateDeclaration, type ProductFacts } from '@/utils/docGenerators';
import type { JourneyData } from '@/utils/deriveJourney';

/** Everything the CRA roadmap needs besides the diagram and the CI runs. No access check: callers do that. */
export async function loadJourneyData(projectId: string): Promise<JourneyData & { sdl: { done: number }; projectName: string; orgChecklist: CraChecklist }> {
  const [project, org, frozen, sbomCount, lastScan, assessment, incidents] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, craClass: true, intendedPurpose: true, supportPeriodEnd: true, supportPeriodRationale: true, craChecklist: true, docData: true },
    }),
    getOrg(),
    prisma.projectVersion.count({ where: { projectId, status: 'frozen' } }),
    prisma.projectSbom.count({ where: { projectId, version: { status: 'active' } } }),
    prisma.cveScanRun.findFirst({ where: { status: 'completed' }, orderBy: { finishedAt: 'desc' }, select: { finishedAt: true } }),
    prisma.assessment.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' }, select: { status: true } }),
    incidentCounts(projectId),
  ]);
  if (!project) throw new Error('Project not found');

  return {
    craClass: project.craClass,
    intendedPurpose: project.intendedPurpose,
    supportPeriodEnd: project.supportPeriodEnd?.toISOString() ?? null,
    supportPeriodRationale: project.supportPeriodRationale,
    checklist: mergeChecklist(org.craChecklist, project.craChecklist),
    orgChecklist: Object.fromEntries(Object.entries(sanitizeCraChecklist(org.craChecklist)).filter(([id]) => (ORG_REQUIREMENTS as readonly string[]).includes(id))),
    publisherContact: !!org.contactDetails?.trim(),
    hasFrozenVersion: frozen > 0,
    hasSbom: sbomCount > 0,
    lastCveScanAt: lastScan?.finishedAt?.toISOString() ?? null,
    assessment: (assessment?.status as 'open' | 'approved' | 'rejected' | undefined) ?? 'none',
    incidents,
    docsReady: docsReady(project, org.contactDetails, org.name || org.publisherName),
    projectName: project.name,
    sdl: { done: Object.values((org.sdlChecklist ?? {}) as Record<string, boolean>).filter(Boolean).length },
  };
}

/** Whether the generated documents still have open points (used by the roadmap). */
function docsReady(
  project: { name: string; craClass: string | null; intendedPurpose: string | null; supportPeriodEnd: Date | null; supportPeriodRationale: string | null; docData: unknown },
  contact: string | null,
  company: string | null,
): { annexII: boolean; declaration: boolean } {
  const data = sanitizeDocData(project.docData);
  if (!data.manufacturer.name && company) data.manufacturer.name = company;
  const facts: ProductFacts = {
    productName: project.name, version: null, intendedPurpose: project.intendedPurpose, supportPeriodEnd: project.supportPeriodEnd?.toISOString() ?? null,
    supportPeriodRationale: project.supportPeriodRationale, vulnerabilityContact: contact?.trim() || null, craClass: project.craClass,
  };
  return { annexII: generateAnnexII(data, facts, 'en').missing.length === 0, declaration: generateDeclaration(data, facts, 'en').missing.length === 0 };
}

