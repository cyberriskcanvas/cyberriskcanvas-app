import { describe, expect, it } from 'vitest';
import { deriveTasks } from '../deriveTasks';
import type { DiagramNode } from '@/types';

const node = (id: string, data: object, type = 'software'): DiagramNode =>
  ({ id, type, position: { x: 0, y: 0 }, data: { label: id, ...data } }) as unknown as DiagramNode;

describe('deriveTasks', () => {
  it('asks to confirm drafts and does not ask to assess draft threats', () => {
    const tasks = deriveTasks({ nodes: [node('api', { threats: [{ id: 't1', name: 'X', stride: 'S', draft: true }], assets: [{ id: 'a1', name: 'A', category: 'data', draft: true }] })] });
    expect(tasks.map((t) => t.kind)).toEqual(['confirm_draft']);
    expect(tasks[0]).toMatchObject({ nodeId: 'api', tab: 'threats' });
  });

  it('walks threat -> risk -> measure -> implemented', () => {
    const base = { threats: [{ id: 't1', name: 'Spoofing', stride: 'S' }] };
    expect(deriveTasks({ nodes: [node('n', base)] })[0]).toMatchObject({ kind: 'assess_threat', tab: 'risks' });

    const risk = { id: 'r1', threatId: 't1', level: 'high', status: 'open' };
    expect(deriveTasks({ nodes: [node('n', { ...base, risks: [risk] })] })[0]).toMatchObject({ kind: 'add_measure', level: 'critical', tab: 'measures' });

    const m = (status: string) => ({ id: 'm1', title: 'MFA', status, riskId: 'r1' });
    expect(deriveTasks({ nodes: [node('n', { ...base, risks: [risk], measures: [m('open')] })] })[0].kind).toBe('open_measure');
    expect(deriveTasks({ nodes: [node('n', { ...base, risks: [risk], measures: [m('mitigated')] })] })).toEqual([]);
  });

  it('skips accepted risks, boundaries and CI-linked failed tests; adds gate reasons last-by-level', () => {
    const accepted = { id: 'r1', threatId: 't1', level: 'low', status: 'open', acceptedBy: 'Jo' };
    const tasks = deriveTasks({
      nodes: [
        node('b', { threats: [{ id: 'x', name: 'X', stride: 'S' }] }, 'boundary'),
        node('n', {
          threats: [{ id: 't1', name: 'T', stride: 'S' }], risks: [accepted],
          securityTests: [{ id: 's1', title: 'linked', status: 'failed', ciSource: 'sast' }, { id: 's2', title: 'manual', status: 'failed' }],
        }),
      ],
      gateReasons: ['2 untriaged high+ vulnerabilities'],
    });
    expect(tasks.map((t) => t.kind).sort()).toEqual(['ci_gate', 'failed_test']);
    expect(tasks.find((t) => t.kind === 'ci_gate')?.target).toBe('operations');
  });

  it('sorts critical before warning before info', () => {
    const tasks = deriveTasks({ nodes: [node('n', { threats: [{ id: 't1', name: 'T', stride: 'S' }, { id: 't2', name: 'U', stride: 'T' }], risks: [{ id: 'r1', threatId: 't2', level: 'critical', status: 'open' }] })] });
    expect(tasks.map((t) => t.level)).toEqual(['critical', 'info']);
  });
});

import type { Finding } from '../modelCheck';
describe('model findings as tasks', () => {
  const f = (severity: Finding['severity'], id: string): Finding => ({ id, ruleId: 'M03', severity, nodeIds: ['a'], edgeIds: [], params: { component: 'API', stated: 'none' }, craRefs: [], iecRefs: [] });
  it('adds high and medium findings, skips low, with the right urgency', () => {
    const tasks = deriveTasks({ nodes: [], modelFindings: [f('high', 'M03:a'), f('medium', 'M03:b'), f('low', 'M08:c')] });
    expect(tasks.map((t) => [t.kind, t.level, t.target])).toEqual([['model_finding', 'critical', 'modelcheck'], ['model_finding', 'warning', 'modelcheck']]);
  });
});
