'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/access';
import { sanitizeCraChecklist, sanitizeCraChecklistEntry, type CraChecklist } from '@/lib/craChecklist';
import { mergeChecklist } from '@/lib/organisation';
import { loadJourneyData } from '@/lib/journeyData';
import { getOrg } from '@/lib/organisationStore';
import { isCraClass } from '@/data/conformity';
import { CRA_REQUIREMENTS } from '@/data/cra';
import type { JourneyData } from '@/utils/deriveJourney';
import { sanitizeDocData, type DocData } from '@/lib/docData';
import type { ProductFacts } from '@/utils/docGenerators';

export interface ProductInfo {
  craClass: string | null;
  intendedPurpose: string | null;
  supportPeriodEnd: string | null;
  supportPeriodRationale: string | null;
}

/** Everything the CRA roadmap needs besides the diagram and the CI runs. */
export async function getJourneyData(projectId: string): Promise<JourneyData & { sdl: { done: number }; projectName: string; orgChecklist: CraChecklist }> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  return loadJourneyData(projectId);
}

export async function saveProductInfo(projectId: string, patch: Partial<ProductInfo>): Promise<void> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);

  const data: Record<string, unknown> = {};
  if ('craClass' in patch) data.craClass = patch.craClass === null || isCraClass(patch.craClass) ? patch.craClass : undefined;
  if (typeof patch.intendedPurpose === 'string') data.intendedPurpose = patch.intendedPurpose.trim().slice(0, 4000) || null;
  if (typeof patch.supportPeriodRationale === 'string') data.supportPeriodRationale = patch.supportPeriodRationale.trim().slice(0, 4000) || null;
  if ('supportPeriodEnd' in patch) {
    const d = patch.supportPeriodEnd ? new Date(patch.supportPeriodEnd) : null;
    data.supportPeriodEnd = d && !isNaN(d.getTime()) ? d : null;
    data.supportReminders = {}; // a new end date starts the reminders over
  }
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  if (Object.keys(data).length > 0) await prisma.project.update({ where: { id: projectId }, data });
}

/** Sets (entry) or clears (null) the product-level decision for one CRA requirement. */
export async function saveCraChecklistEntry(projectId: string, requirementId: string, entry: unknown): Promise<CraChecklist> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  if (!CRA_REQUIREMENTS.some((r) => r.id === requirementId)) throw new Error('Unknown requirement');

  // ponytail: read-modify-write of one JSON column; two people editing the same project at the same second can overwrite each other
  const current = await prisma.project.findUnique({ where: { id: projectId }, select: { craChecklist: true } });
  const checklist = sanitizeCraChecklist(current?.craChecklist);
  const clean = entry === null ? null : sanitizeCraChecklistEntry(entry);
  if (clean) checklist[requirementId] = clean;
  else delete checklist[requirementId];
  await prisma.project.update({ where: { id: projectId }, data: { craChecklist: checklist as object } });
  // what the product effectively has: organisation decisions unless the product overrides them
  return mergeChecklist((await getOrg()).craChecklist, checklist);
}

export interface DocContext {
  data: DocData;
  facts: ProductFacts;
  documents: Array<{ id: string; name: string }>;
}

/** Stored document data plus the product facts the generators combine it with. */
export async function getDocContext(projectId: string): Promise<DocContext> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);
  const [project, org, version, documents] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true, craClass: true, intendedPurpose: true, supportPeriodEnd: true, supportPeriodRationale: true, docData: true } }),
    getOrg(),
    prisma.projectVersion.findFirst({ where: { projectId }, orderBy: { number: 'desc' }, select: { number: true, label: true } }),
    prisma.projectDocument.findMany({ where: { projectId }, select: { id: true, name: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  if (!project) throw new Error('Project not found');
  const data = sanitizeDocData(project.docData);
  // sensible defaults so the forms start filled
  const orgName = org.name || org.publisherName;
  if (!data.manufacturer.name && orgName) data.manufacturer.name = orgName;
  return {
    data,
    documents,
    facts: {
      productName: project.name,
      version: version ? version.label || `Version ${version.number}` : null,
      intendedPurpose: project.intendedPurpose,
      supportPeriodEnd: project.supportPeriodEnd?.toISOString() ?? null,
      supportPeriodRationale: project.supportPeriodRationale,
      vulnerabilityContact: org.contactDetails?.trim() || null,
      craClass: project.craClass,
    },
  };
}

export async function saveDocData(projectId: string, input: unknown): Promise<DocData> {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  const data = sanitizeDocData(input);

  // attached documents must belong to this project; the name is taken from the database
  const ids = Object.values(data.annexVII).map((e) => e?.documentId).filter((x): x is string => !!x);
  if (ids.length > 0) {
    const docs = await prisma.projectDocument.findMany({ where: { projectId, id: { in: ids } }, select: { id: true, name: true } });
    const names = new Map(docs.map((d) => [d.id, d.name]));
    for (const e of Object.values(data.annexVII)) {
      if (!e?.documentId) continue;
      if (names.has(e.documentId)) e.documentName = names.get(e.documentId);
      else { delete e.documentId; delete e.documentName; }
    }
  }
  await prisma.project.update({ where: { id: projectId }, data: { docData: data as object } });
  return data;
}
