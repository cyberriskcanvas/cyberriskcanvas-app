// The organisation's own roadmap: what the manufacturer has to settle once for all products.
import { ORG_REQUIREMENTS, type StoredSecurityTxt } from '@/lib/organisation';
import type { CraChecklist } from '@/lib/craChecklist';
import type { ReadinessAnswers } from '@/lib/readiness';

export type OrgStationId = 'profile' | 'contact' | 'requirements' | 'sdl' | 'readiness';
export const ORG_STATION_IDS: readonly OrgStationId[] = ['profile', 'contact', 'requirements', 'sdl', 'readiness'];

export type OrgStationStatus = 'open' | 'progress' | 'done';

export interface OrgStation {
  id: OrgStationId;
  status: OrgStationStatus;
  done: number;
  total: number;
  /** Codes of the criteria that are still open (looked up in the i18n dictionary). */
  missing: string[];
}

export interface OrgInput {
  name: string;
  publisherName: string | null;
  publisherNamespace: string | null;
  contactDetails: string | null;
  securityTxt: StoredSecurityTxt;
  checklist: CraChecklist;
  sdl: Record<string, boolean>;
  sdlTotal: number;
  readiness: ReadinessAnswers;
  /** Ids of the self-assessment questions that are about the organisation. */
  readinessQuestionIds: readonly string[];
}

const filled = (v: string | null | undefined) => !!v?.trim();

function station(id: OrgStationId, checks: Array<{ code: string; ok: boolean }>): OrgStation {
  const done = checks.filter((c) => c.ok).length;
  return { id, done, total: checks.length, status: done === 0 ? 'open' : done === checks.length ? 'done' : 'progress', missing: checks.filter((c) => !c.ok).map((c) => c.code) };
}

export function deriveOrgStations(o: OrgInput): OrgStation[] {
  const sdlDone = Object.values(o.sdl).filter(Boolean).length;
  const answeredYes = o.readinessQuestionIds.filter((id) => o.readiness[id] === 'yes').length;
  const answered = o.readinessQuestionIds.filter((id) => o.readiness[id]).length;

  const sdl = sdlDone === 0 ? 'open' : sdlDone >= o.sdlTotal ? 'done' : 'progress';
  const readiness: OrgStationStatus = answered === 0 ? 'open' : answeredYes === o.readinessQuestionIds.length ? 'done' : 'progress';

  return [
    station('profile', [
      { code: 'name', ok: filled(o.name) || filled(o.publisherName) },
      { code: 'publisher', ok: filled(o.publisherName) },
      { code: 'namespace', ok: filled(o.publisherNamespace) },
    ]),
    station('contact', [
      { code: 'contact', ok: filled(o.contactDetails) },
      { code: 'domain', ok: filled(o.securityTxt.domain) },
      { code: 'psirt', ok: filled(o.securityTxt.psirtEmail) },
    ]),
    station('requirements', ORG_REQUIREMENTS.map((id) => ({ code: id, ok: !!o.checklist[id] }))),
    { id: 'sdl', status: sdl, done: sdlDone, total: o.sdlTotal, missing: sdl === 'done' ? [] : ['sdl'] },
    { id: 'readiness', status: readiness, done: answeredYes, total: o.readinessQuestionIds.length, missing: readiness === 'done' ? [] : ['readiness'] },
  ];
}
