import { describe, expect, it } from 'vitest';
import { daysUntilSupportEnd, deriveJourney, nextStepOf, type JourneyData, type Station } from '../deriveJourney';
import { CRA_REQUIREMENTS } from '@/data/cra';
import type { CraChecklist } from '@/lib/craChecklist';
import type { DiagramNode } from '@/types';

const NOW = new Date('2026-10-17T12:00:00Z');
const empty: JourneyData = {
  craClass: null, intendedPurpose: null, supportPeriodEnd: null, supportPeriodRationale: null,
  checklist: {}, publisherContact: false, hasFrozenVersion: false, hasSbom: false, lastCveScanAt: null,
};
const node = (data: object): DiagramNode => ({ id: 'n', type: 'software', position: { x: 0, y: 0 }, data: { label: 'API', ...data } }) as unknown as DiagramNode;
const allDecided: CraChecklist = Object.fromEntries(CRA_REQUIREMENTS.map((r) => [r.id, { status: 'compliant' as const }]));
const st = (stations: ReturnType<typeof deriveJourney>, id: string) => stations.find((s) => s.id === id)!;

describe('deriveJourney', () => {
  it('starts with every station open on an empty project', () => {
    const j = deriveJourney({ nodes: [], ciLatest: null, gateReasons: null, data: empty, now: NOW });
    expect(j).toHaveLength(10);
    expect(j.map((s) => s.status)).toEqual(Array(10).fill('open'));
  });

  it('completes every station with full data', () => {
    const nodes = [node({
      threats: [{ id: 't1', name: 'Spoofing', stride: 'S' }],
      risks: [{ id: 'r1', threatId: 't1', level: 'high', status: 'open' }],
      measures: [{ id: 'm1', title: 'MFA', status: 'mitigated', riskId: 'r1' }],
    })];
    const j = deriveJourney({
      nodes,
      ciLatest: [{ source: 'sast', result: 'ok' }, { source: 'secrets', result: 'ok' }, { source: 'sbom', result: 'ok' }],
      gateReasons: [],
      data: {
        craClass: 'default', intendedPurpose: 'Smart gateway', supportPeriodEnd: '2031-12-31T00:00:00Z', supportPeriodRationale: 'expected use 5 years',
        checklist: allDecided, publisherContact: true, hasFrozenVersion: true, hasSbom: true, lastCveScanAt: '2026-10-16T00:00:00Z',
        docsReady: { annexII: true, declaration: true },
      },
      now: NOW,
    });
    expect(j.filter((s) => s.status !== 'done').map((s) => s.id)).toEqual([]);
  });

  it('shows partial progress and the failing checks', () => {
    const j = deriveJourney({
      nodes: [node({ threats: [{ id: 't1', name: 'X', stride: 'S', draft: true }] })],
      ciLatest: [{ source: 'sast', result: 'findings' }],
      gateReasons: [{ code: 'open_vulnerabilities' }],
      data: { ...empty, checklist: { 'ER.0': { status: 'non-compliant' } }, intendedPurpose: 'x', lastCveScanAt: '2026-09-01T00:00:00Z' },
      now: NOW,
    });
    expect(st(j, 'risk').status).toBe('progress'); // drafts exist, nothing to assess yet
    expect(st(j, 'risk').checks.find((c) => c.code === 'drafts_confirmed')?.ok).toBe(false);
    expect(st(j, 'requirements')).toMatchObject({ status: 'progress', progress: { done: 1 } }); // non-compliant is a decision
    expect(st(j, 'secdev')).toMatchObject({ status: 'progress' });
    expect(st(j, 'sbom').checks.find((c) => c.code === 'vulns_triaged')?.ok).toBe(false);
    expect(st(j, 'postmarket').checks.find((c) => c.code === 'cve_monitoring')?.ok).toBe(false); // scan older than 7 days
  });

  it('counts component-level CRA mappings (incl. legacy ids) as decisions', () => {
    const j = deriveJourney({ nodes: [node({ cra: [{ requirementId: 'ER.1', status: 'compliant' }] })], ciLatest: null, gateReasons: null, data: empty, now: NOW });
    expect(st(j, 'requirements').progress?.done).toBe(1);
  });

  it('does not count the gate as passed without any CI run', () => {
    const j = deriveJourney({ nodes: [], ciLatest: [], gateReasons: [], data: empty, now: NOW });
    expect(st(j, 'release').checks.find((c) => c.code === 'gate_pass')?.ok).toBe(false);
  });

  it('computes days until the end of support', () => {
    expect(daysUntilSupportEnd('2026-10-27T12:00:00Z', NOW)).toBe(10);
    expect(daysUntilSupportEnd(null, NOW)).toBeNull();
  });
});

describe('architecture check in the roadmap', () => {
  it('keeps the risk station from completing while high/medium model findings are open', () => {
    const nodes = [node({ threats: [{ id: 't1', name: 'S', stride: 'S' }], risks: [{ id: 'r1', threatId: 't1', level: 'low', status: 'mitigated' }] })];
    const finding = { id: 'M03:n', ruleId: 'M03' as const, severity: 'high' as const, nodeIds: ['n'], edgeIds: [], params: {}, craRefs: [], iecRefs: [] };
    const clean = deriveJourney({ nodes, ciLatest: null, gateReasons: null, data: empty, now: NOW });
    const dirty = deriveJourney({ nodes, ciLatest: null, gateReasons: null, data: empty, modelFindings: [finding], now: NOW });
    expect(st(clean, 'risk').status).toBe('done');
    expect(st(dirty, 'risk').status).toBe('progress');
  });
});

describe('assessment in the roadmap', () => {
  it('only asks for approval once an assessment exists', () => {
    const none = deriveJourney({ nodes: [], ciLatest: null, gateReasons: null, data: { ...empty, assessment: 'none' }, now: NOW });
    expect(st(none, 'release').checks.some((c) => c.code === 'assessment_approved')).toBe(false);
    const open = deriveJourney({ nodes: [], ciLatest: null, gateReasons: null, data: { ...empty, assessment: 'open' }, now: NOW });
    expect(st(open, 'release').checks.find((c) => c.code === 'assessment_approved')?.ok).toBe(false);
    const done = deriveJourney({ nodes: [], ciLatest: null, gateReasons: null, data: { ...empty, assessment: 'approved' }, now: NOW });
    expect(st(done, 'release').checks.find((c) => c.code === 'assessment_approved')?.ok).toBe(true);
  });
});

describe('Art. 14 cases in the roadmap', () => {
  it('only checks reporting deadlines while a case is open', () => {
    const codes = (incidents?: { open: number; overdue: number }) =>
      st(deriveJourney({ nodes: [], ciLatest: null, gateReasons: null, data: { ...empty, incidents }, now: NOW }), 'postmarket').checks.map((c) => c.code);
    expect(codes({ open: 0, overdue: 0 })).not.toContain('reports_on_time');
    expect(codes({ open: 1, overdue: 0 })).toContain('reports_on_time');
    const overdue = deriveJourney({ nodes: [], ciLatest: null, gateReasons: null, data: { ...empty, incidents: { open: 2, overdue: 1 } }, now: NOW });
    expect(st(overdue, 'postmarket').checks.find((c) => c.code === 'reports_on_time')?.ok).toBe(false);
  });
});

describe('nextStepOf', () => {
  const st = (id: Station['id'], status: Station['status'], next: Station['next'] = []): Station => ({ id, status, checks: [], next });
  it('returns the first unfinished station and its first action', () => {
    const r = nextStepOf([st('classify', 'done'), st('risk', 'progress', [{ kind: 'tab', target: 'tasks' }]), st('requirements', 'open')]);
    expect(r?.station.id).toBe('risk');
    expect(r?.next).toEqual({ kind: 'tab', target: 'tasks' });
  });
  it('is null when everything is done, next is null without actions', () => {
    expect(nextStepOf([st('classify', 'done')])).toBeNull();
    expect(nextStepOf([st('classify', 'open')])?.next).toBeNull();
  });
});
