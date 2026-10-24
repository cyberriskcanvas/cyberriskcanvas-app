// CRA roadmap: ten stations from classification to post-market, each with a status computed
// from data the project already has. Pure, so it can be tested and reused (UI, later reports).
import type { CRAMapping, DiagramNode, Threat } from '@/types';
import { CRA_REQUIREMENTS, resolveCRARequirement } from '@/data/cra';
import type { CraChecklist } from '@/lib/craChecklist';
import { deriveTasks } from './deriveTasks';
import type { Finding } from './modelCheck';

export type StationId =
  | 'classify' | 'risk' | 'requirements' | 'secdev' | 'sbom'
  | 'vulnprocess' | 'userinfo' | 'techdoc' | 'release' | 'postmarket';

export type StationStatus = 'open' | 'progress' | 'done';

/** A single criterion of a station; `code` is looked up in the i18n dictionary. */
export interface StationCheck {
  code: string;
  ok: boolean;
}

export type StationNext =
  | { kind: 'panel'; target: 'product' | 'docs-manufacturer' | 'docs-userinfo' | 'docs-techdoc' | 'docs-declaration' }
  | { kind: 'tab'; target: 'tasks' | 'operations' | 'csaf' | 'design'; step?: 'reporting' }
  | { kind: 'checklist'; group: 'ER' | 'VH' | 'UT' | 'TD' }
  | { kind: 'settings'; target: 'organisation' }
  | { kind: 'dashboard' };

export interface Station {
  id: StationId;
  status: StationStatus;
  checks: StationCheck[];
  /** Fulfilled vs. total items for list-like stations (checklist groups, tasks). */
  progress?: { done: number; total: number };
  next: StationNext[];
}

export interface JourneyData {
  craClass: string | null;
  intendedPurpose: string | null;
  supportPeriodEnd: string | null; // ISO
  supportPeriodRationale: string | null;
  checklist: CraChecklist;
  publisherContact: boolean;
  hasFrozenVersion: boolean;
  hasSbom: boolean;
  lastCveScanAt: string | null; // ISO
  /** Latest assessment of the project; the roadmap only asks for approval once somebody started one. */
  assessment?: 'none' | 'open' | 'approved' | 'rejected';
  /** Generated documents without open points (Annex II text, declaration of conformity). */
  docsReady?: { annexII: boolean; declaration: boolean };
  /** Art. 14 cases: open ones and those with an overdue step. */
  incidents?: { open: number; overdue: number };
}

export interface JourneyInput {
  nodes: DiagramNode[];
  /** Newest CI run per source/part; null when CI is not available (licence/access). */
  ciLatest: Array<{ source: string; result: string }> | null;
  /** Release gate reasons; null when unknown. */
  gateReasons: Array<{ code: string }> | null;
  data: JourneyData;
  /** Open architecture check findings (dismissed ones already removed). */
  modelFindings?: Finding[];
  now?: Date;
}

const SCAN_MAX_AGE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const ids = (prefix: string, exclude: string[] = []) =>
  CRA_REQUIREMENTS.filter((r) => r.id.startsWith(prefix) && !exclude.includes(r.id)).map((r) => r.id);

function station(id: StationId, checks: StationCheck[], next: StationNext[], progress?: Station['progress'], started = false): Station {
  const okCount = checks.filter((c) => c.ok).length;
  const partial = started || (progress ? progress.done > 0 : false);
  const status: StationStatus = okCount === checks.length ? 'done' : okCount > 0 || partial ? 'progress' : 'open';
  return { id, status, checks, next, ...(progress ? { progress } : {}) };
}

export function deriveJourney({ nodes, ciLatest, gateReasons, data, modelFindings = [], now = new Date() }: JourneyInput): Station[] {
  // Requirement decisions: product-level checklist or any component mapping
  const decided = new Set(Object.keys(data.checklist));
  for (const n of nodes) {
    for (const m of (n.data?.cra ?? []) as CRAMapping[]) {
      const req = resolveCRARequirement(m.requirementId);
      if (req) decided.add(req.id);
    }
  }
  const groupProgress = (reqIds: string[]) => ({ done: reqIds.filter((r) => decided.has(r)).length, total: reqIds.length });
  const allDecided = (reqIds: string[]) => reqIds.every((r) => decided.has(r));

  const tasks = deriveTasks({ nodes, modelFindings });
  const realThreats = nodes.flatMap((n) => ((n.data?.threats ?? []) as Threat[]).filter((t) => !t.draft));

  const hasThreats = realThreats.length > 0;
  const hasRun = (source: string) => !!ciLatest?.some((r) => r.source === source);
  const hasSbom = data.hasSbom || hasRun('sbom');
  // without an SBOM there is nothing to triage yet
  const noOpenVulns = hasSbom && gateReasons !== null && !gateReasons.some((r) => r.code === 'open_vulnerabilities');
  const gatePass = gateReasons !== null && gateReasons.length === 0 && (ciLatest?.length ?? 0) > 0;
  const supportEnd = data.supportPeriodEnd ? new Date(data.supportPeriodEnd) : null;
  const scanAgeOk = !!data.lastCveScanAt && now.getTime() - new Date(data.lastCveScanAt).getTime() <= SCAN_MAX_AGE_DAYS * DAY_MS;

  const ER = ids('ER.');
  const VH = ids('VH.', ['VH.1', 'VH.1a']); // SBOM items live in station 5
  const UT = ids('UT.', ['UT.5']); // declaration of conformity lives in station 9
  const TD = ids('TD.');

  return [
    station('classify', [{ code: 'class_set', ok: !!data.craClass }], [{ kind: 'panel', target: 'product' }]),
    station(
      'risk',
      [
        // "nothing open" only counts once there is something to analyse
        { code: 'has_threats', ok: hasThreats },
        { code: 'drafts_confirmed', ok: hasThreats && !tasks.some((t) => t.kind === 'confirm_draft') },
        { code: 'threats_assessed', ok: hasThreats && !tasks.some((t) => t.kind === 'assess_threat') },
        { code: 'risks_treated', ok: hasThreats && !tasks.some((t) => t.kind === 'add_measure') },
        { code: 'model_clean', ok: hasThreats && !tasks.some((t) => t.kind === 'model_finding') },
      ],
      [{ kind: 'tab', target: 'tasks' }, { kind: 'tab', target: 'design' }],
      undefined,
      nodes.some((n) => ((n.data?.threats ?? []) as Threat[]).length > 0), // drafted threats = work has started
    ),
    station('requirements', [{ code: 'er_decided', ok: allDecided(ER) }], [{ kind: 'checklist', group: 'ER' }], groupProgress(ER)),
    station(
      'secdev',
      [
        { code: 'ci_sast', ok: hasRun('sast') },
        { code: 'ci_secrets', ok: hasRun('secrets') },
      ],
      [{ kind: 'tab', target: 'operations' }],
    ),
    station(
      'sbom',
      [
        { code: 'sbom_present', ok: hasSbom },
        { code: 'vulns_triaged', ok: noOpenVulns },
      ],
      [{ kind: 'tab', target: 'operations' }],
    ),
    station(
      'vulnprocess',
      [
        { code: 'vh_decided', ok: allDecided(VH) },
        { code: 'publisher_contact', ok: data.publisherContact },
      ],
      [{ kind: 'settings', target: 'organisation' }, { kind: 'checklist', group: 'VH' }, { kind: 'tab', target: 'csaf' }],
      groupProgress(VH),
    ),
    station(
      'userinfo',
      [
        { code: 'ut_decided', ok: allDecided(UT) },
        { code: 'intended_purpose', ok: !!data.intendedPurpose?.trim() },
        { code: 'support_end', ok: !!supportEnd },
        { code: 'annex2_ready', ok: !!data.docsReady?.annexII },
      ],
      [{ kind: 'panel', target: 'product' }, { kind: 'panel', target: 'docs-userinfo' }, { kind: 'checklist', group: 'UT' }],
      groupProgress(UT),
    ),
    station(
      'techdoc',
      [
        { code: 'td_decided', ok: allDecided(TD) },
        { code: 'support_rationale', ok: !!data.supportPeriodRationale?.trim() },
      ],
      [{ kind: 'checklist', group: 'TD' }, { kind: 'panel', target: 'docs-techdoc' }, { kind: 'dashboard' }],
      groupProgress(TD),
    ),
    station(
      'release',
      [
        { code: 'doc_decided', ok: decided.has('UT.5') },
        { code: 'declaration_ready', ok: !!data.docsReady?.declaration },
        { code: 'gate_pass', ok: gatePass },
        { code: 'version_frozen', ok: data.hasFrozenVersion },
        ...(data.assessment && data.assessment !== 'none' ? [{ code: 'assessment_approved', ok: data.assessment === 'approved' }] : []),
      ],
      [{ kind: 'tab', target: 'operations' }, { kind: 'panel', target: 'docs-declaration' }, { kind: 'checklist', group: 'UT' }],
    ),
    station(
      'postmarket',
      [
        { code: 'support_running', ok: !!supportEnd && supportEnd.getTime() > now.getTime() },
        { code: 'cve_monitoring', ok: scanAgeOk },
        // only asked while a case is open; "no cases" is not an achievement
        ...(data.incidents && data.incidents.open > 0 ? [{ code: 'reports_on_time', ok: data.incidents.overdue === 0 }] : []),
        { code: 'vulns_triaged', ok: noOpenVulns },
      ],
      [{ kind: 'tab', target: 'operations' }, { kind: 'tab', target: 'csaf', step: 'reporting' }, { kind: 'panel', target: 'product' }],
    ),
  ];
}

/** Days until the end of the support period (negative when it has ended), or null. */
export function daysUntilSupportEnd(supportPeriodEnd: string | null, now = new Date()): number | null {
  if (!supportPeriodEnd) return null;
  return Math.ceil((new Date(supportPeriodEnd).getTime() - now.getTime()) / DAY_MS);
}

/** Where the user should go next: the first unfinished station and its first suggested action. */
export function nextStepOf(stations: Station[]): { station: Station; next: StationNext | null } | null {
  const station = stations.find((s) => s.status !== 'done');
  return station ? { station, next: station.next[0] ?? null } : null;
}
