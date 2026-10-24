import { describe, expect, it } from 'vitest';
import { applyDismissals, checkModel, zonesOf } from '../modelCheck';
import { sanitizeDismissed } from '@/lib/modelCheckDismissed';
import type { DiagramEdge, DiagramNode } from '@/types';

const comp = (id: string, data: object, pos = { x: 0, y: 0 }, type = 'software'): DiagramNode =>
  ({ id, type, position: pos, data: { label: id, version: '1.0', threats: [{ id: `${id}-t`, name: 't', stride: 'S' }], ...data } }) as unknown as DiagramNode;
const zone = (id: string, x: number, y: number, w: number, h: number): DiagramNode =>
  ({ id, type: 'boundary', position: { x, y }, style: { width: w, height: h }, data: { label: id, boundaryType: 'trust-zone' } }) as unknown as DiagramNode;
const edge = (id: string, source: string, target: string, data: object = {}): DiagramEdge => ({ id, source, target, data }) as DiagramEdge;
const rules = (nodes: DiagramNode[], edges: DiagramEdge[] = [], decided?: Set<string>) =>
  checkModel({ nodes, edges, decidedRequirements: decided }).map((f) => f.ruleId).sort();

describe('zonesOf', () => {
  it('uses the parent boundary, else geometric containment (smallest zone wins)', () => {
    const nodes = [zone('outer', 0, 0, 1000, 1000), zone('inner', 100, 100, 300, 300), comp('a', {}, { x: 120, y: 120 }), comp('b', {}, { x: 600, y: 600 }), comp('c', {}, { x: 5000, y: 5000 }), { ...comp('d', {}, { x: 10, y: 10 }), parentId: 'outer' } as DiagramNode];
    const z = zonesOf(nodes);
    expect([z.get('a'), z.get('b'), z.get('c'), z.get('d')]).toEqual(['inner', 'outer', null, 'outer']);
  });
});

describe('rules', () => {
  const inZone = [zone('z', 0, 0, 400, 400)];

  it('M01 unencrypted flow across a boundary (high), M02 insecure protocol inside a zone (medium)', () => {
    const nodes = [...inZone, comp('in', {}, { x: 50, y: 50 }), comp('out', {}, { x: 900, y: 900 }), comp('in2', {}, { x: 200, y: 200 })];
    expect(rules(nodes, [edge('e1', 'in', 'out', { protocol: 'HTTP', encrypted: false })])).toEqual(['M01']);
    expect(rules(nodes, [edge('e2', 'in', 'in2', { protocol: 'MQTT', encrypted: false })])).toEqual(['M02']);
    expect(rules(nodes, [edge('e3', 'in', 'out', { protocol: 'HTTPS', encrypted: true })])).toEqual([]);
    expect(rules(nodes, [edge('e4', 'in', 'in2', { protocol: 'MQTT/TLS', encrypted: true })])).toEqual([]);
  });

  it('M03 internet-facing without stated or with no authentication', () => {
    expect(checkModel({ nodes: [comp('api', { exposure: 'internet' })], edges: [] })[0]).toMatchObject({ ruleId: 'M03', severity: 'medium' });
    expect(checkModel({ nodes: [comp('api', { exposure: 'internet', authentication: 'none' })], edges: [] })[0]).toMatchObject({ ruleId: 'M03', severity: 'high' });
    expect(rules([comp('api', { exposure: 'internet', authentication: 'mfa' })])).toEqual([]);
  });

  it('M04 internet-facing component wired directly to a critical component', () => {
    const nodes = [comp('web', { exposure: 'internet', authentication: 'password', componentType: 'application' }), comp('plc', { componentType: 'plc' }, { x: 300, y: 0 }, 'hardware')];
    expect(rules(nodes, [edge('e', 'web', 'plc')])).toEqual(['M04']);
    expect(rules(nodes, [])).toEqual([]);
  });

  it('M05 maintenance interface reachable beyond physical access', () => {
    expect(rules([comp('obd', { componentType: 'obd', exposure: 'local-network' }, undefined, 'hardware')])).toEqual(['M05']);
    expect(rules([comp('obd', { componentType: 'obd', exposure: 'physical' }, undefined, 'hardware')])).toEqual([]);
  });

  it('M06 personal data without an ER.6 decision, satisfied by node mapping or product checklist', () => {
    const pii = comp('db', { personalData: true });
    expect(rules([pii])).toEqual(['M06']);
    expect(rules([comp('db', { personalData: true, cra: [{ requirementId: 'ER.6', status: 'compliant' }] })])).toEqual([]);
    expect(rules([pii], [], new Set(['ER.6']))).toEqual([]);
  });

  it('M07 conduit between different security levels needs a description', () => {
    const nodes = [...inZone, comp('a', { securityLevel: 'SL-1' }, { x: 50, y: 50 }), comp('b', { securityLevel: 'SL-3' }, { x: 900, y: 900 })];
    expect(rules(nodes, [edge('e', 'a', 'b', { protocol: 'HTTPS', encrypted: true })])).toEqual(['M07']);
    expect(rules(nodes, [edge('e', 'a', 'b', { protocol: 'HTTPS', encrypted: true, description: 'firewall + data diode' })])).toEqual([]);
  });

  it('M08 software component without version, M09 RDPS without analysis, M10 blind spot', () => {
    expect(rules([comp('lib', { version: '' })])).toEqual(['M08']);
    expect(rules([comp('be', { scope: 'rdps_backend', threats: [] })])).toEqual(['M09']);
    expect(rules([comp('x', { threats: [] })])).toEqual(['M10']);
    expect(rules([comp('x', { threats: [{ id: 't', name: 'd', stride: 'S', draft: true }] })])).toEqual([]); // drafts: the task list handles them
  });

  it('M11 high-scoring attack path without any measure', () => {
    const risky = { risks: [{ id: 'r', threatId: 'a-t', likelihood: 5, impact: 5, level: 'critical', status: 'open' }] };
    const nodes = [comp('gw', { componentType: 'gateway', ...risky }, { x: 0, y: 0 }, 'hardware'), comp('ecu', { componentType: 'ecu', ...risky }, { x: 300, y: 0 }, 'hardware')];
    expect(rules(nodes, [edge('e', 'gw', 'ecu')])).toContain('M11');
    const mitigated = nodes.map((n) => ({ ...n, data: { ...n.data, measures: [{ id: 'm', title: 'x', status: 'open' }] } })) as DiagramNode[];
    expect(rules(mitigated, [edge('e', 'gw', 'ecu')])).not.toContain('M11');
  });
});

describe('findings and dismissals', () => {
  it('has stable ids and splits open from dismissed findings, sorted by severity', () => {
    const nodes = [comp('api', { exposure: 'internet' }), comp('db', { personalData: true })];
    const a = checkModel({ nodes, edges: [] });
    const b = checkModel({ nodes: [...nodes].reverse(), edges: [] });
    expect(a.map((f) => f.id).sort()).toEqual(b.map((f) => f.id).sort());
    const { open, dismissed } = applyDismissals(a, { [a[0].id]: 'accepted by design' });
    expect(dismissed).toEqual([{ finding: a[0], reason: 'accepted by design' }]);
    expect(open).toHaveLength(a.length - 1);
  });

  it('sanitizes stored dismissals', () => {
    expect(sanitizeDismissed({ 'M01:a+b': ' ok ', 'M01:c': '', 'XX:y': 'no', 'M02:z': 5 })).toEqual({ 'M01:a+b': 'ok' });
    expect(sanitizeDismissed(null)).toEqual({});
  });
});
