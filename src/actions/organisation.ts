'use server';

import { requireAdmin, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getOrg } from '@/lib/organisationStore';
import { TR03185_REQUIREMENTS } from '@/data/tr03185';
import { sanitizeCraChecklist, sanitizeCraChecklistEntry, type CraChecklist } from '@/lib/craChecklist';
import { sanitizeSdlChecklist } from '@/lib/sdlChecklist';
import { isOrgRequirement, sanitizeOrgProfile, sanitizeSecurityTxt, type OrgProfile, type StoredSecurityTxt } from '@/lib/organisation';
import { isReadinessAnswer, sanitizeReadiness, type ReadinessAnswers } from '@/lib/readiness';
import { READINESS_QUESTIONS } from '@/data/readinessQuestions';

const SDL_IDS: ReadonlySet<string> = new Set(TR03185_REQUIREMENTS.map((r) => r.id));

export interface OrganisationDto extends OrgProfile {
  securityTxt: StoredSecurityTxt;
  checklist: CraChecklist;
  sdl: Record<string, boolean>;
  /** Answers to the self-assessment questions about the organisation. */
  readiness: ReadinessAnswers;
  updatedByName: string | null;
  /** Whether the current user may change it. */
  canEdit: boolean;
}

async function toDto(canEdit: boolean): Promise<OrganisationDto> {
  const [o, readiness] = await Promise.all([getOrg(), prisma.orgReadiness.findUnique({ where: { id: 'org' } })]);
  return {
    name: o.name, publisherName: o.publisherName, publisherNamespace: o.publisherNamespace, publisherCategory: o.publisherCategory,
    issuingAuthority: o.issuingAuthority, contactDetails: o.contactDetails,
    securityTxt: sanitizeSecurityTxt(o.securityTxt),
    checklist: sanitizeCraChecklist(o.craChecklist),
    sdl: sanitizeSdlChecklist(o.sdlChecklist, SDL_IDS),
    readiness: sanitizeReadiness(readiness?.answers),
    updatedByName: o.updatedByName,
    canEdit,
  };
}

/** Readable by every signed-in user, writable by admins. */
export async function getOrganisation(): Promise<OrganisationDto> {
  const session = await requireSession();
  return toDto(session.user.role === 'admin');
}

async function write(data: Record<string, unknown>, what: string): Promise<OrganisationDto> {
  const session = await requireAdmin();
  await getOrg();
  await prisma.organisation.update({ where: { id: 'org' }, data: { ...data, updatedByName: session.user.name ?? session.user.email ?? null } });
  audit({ action: 'organisation.update', actorId: session.user.id, actorEmail: session.user.email, details: { what } });
  return toDto(true);
}

export async function updateOrgProfile(patch: Record<string, unknown>): Promise<OrganisationDto> {
  return write(sanitizeOrgProfile(patch), 'profile');
}

export async function saveOrgSecurityTxt(cfg: unknown): Promise<OrganisationDto> {
  return write({ securityTxt: sanitizeSecurityTxt(cfg) }, 'security.txt');
}

/** Sets (entry) or clears (null) the organisation decision for one of the organisation-wide requirements. */
export async function saveOrgRequirement(id: string, entry: unknown): Promise<OrganisationDto> {
  if (!isOrgRequirement(id)) throw new Error('Not an organisation-wide requirement');
  await requireAdmin();
  const current = sanitizeCraChecklist((await getOrg()).craChecklist);
  const clean = entry === null ? null : sanitizeCraChecklistEntry(entry);
  if (entry !== null && !clean) throw new Error('Invalid entry');
  if (clean) current[id] = clean; else delete current[id];
  return write({ craChecklist: current }, 'requirement');
}

export async function saveOrgSdl(checklist: Record<string, boolean>): Promise<OrganisationDto> {
  return write({ sdlChecklist: sanitizeSdlChecklist(checklist, SDL_IDS) }, 'sdl');
}

/** Answers (or clears, with null) one self-assessment question about the organisation. */
export async function saveOrgReadinessAnswer(questionId: string, answer: unknown): Promise<OrganisationDto> {
  const session = await requireAdmin();
  const question = READINESS_QUESTIONS.find((q) => q.id === questionId);
  if (!question || question.scope !== 'org') throw new Error('Unknown organisation question');
  if (answer !== null && !isReadinessAnswer(answer)) throw new Error('Invalid answer');
  // ponytail: read-modify-write of a JSON column; concurrent edits in the same second can overwrite each other
  const row = await prisma.orgReadiness.findUnique({ where: { id: 'org' } });
  const next = sanitizeReadiness(row?.answers);
  if (answer) next[questionId] = answer; else delete next[questionId];
  const by = session.user.name ?? null;
  await prisma.orgReadiness.upsert({ where: { id: 'org' }, create: { id: 'org', answers: next, updatedByName: by }, update: { answers: next, updatedByName: by } });
  audit({ action: 'organisation.update', actorId: session.user.id, actorEmail: session.user.email, details: { what: 'readiness' } });
  return toDto(true);
}
