import { describe, it, expect } from 'vitest';
import { computeAttackPaths } from '../attackPaths';
import type { DiagramNode, DiagramEdge, NodeData, Risk, Threat } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(
  id: string,
  type: string,
  data: Partial<NodeData> = {},
): DiagramNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, ...data },
  } as DiagramNode;
}

function makeEdge(source: string, target: string): DiagramEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
  } as DiagramEdge;
}

function makeRisk(likelihood: 1 | 2 | 3 | 4 | 5, impact: 1 | 2 | 3 | 4 | 5, level: Risk['level'] = 'medium'): Risk {
  return { id: `r-${Math.random()}`, threatId: 't1', likelihood, impact, level, status: 'open' };
}

function makeThreat(withCwe = false): Threat {
  return { id: `t-${Math.random()}`, name: 'Test Threat', stride: 'T', cweId: withCwe ? 'CWE-79' : undefined };
}

// ─── computeAttackPaths ───────────────────────────────────────────────────────

describe('computeAttackPaths', () => {
  it('returns empty array for empty graph', () => {
    expect(computeAttackPaths([], [])).toEqual([]);
  });

  it('returns empty array for single node with no edges', () => {
    const nodes = [makeNode('A', 'hardware')];
    expect(computeAttackPaths(nodes, [])).toEqual([]);
  });

  it('finds a simple 3-node path: entry → middle → target', () => {
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),                // entry point
      makeNode('mid', 'hardware'),
      makeNode('ecu', 'hardware', { componentType: 'ecu' }),                   // critical target
    ];
    const edges = [makeEdge('gw', 'mid'), makeEdge('mid', 'ecu')];

    const paths = computeAttackPaths(nodes, edges);

    expect(paths.length).toBeGreaterThan(0);
    const topPath = paths[0];
    expect(topPath.entryNodeId).toBe('gw');
    expect(topPath.targetNodeId).toBe('ecu');
    expect(topPath.nodeIds).toEqual(['gw', 'mid', 'ecu']);
    expect(topPath.hops).toHaveLength(3);
  });

  it('treats edges as undirected (path works both ways)', () => {
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('ecu', 'hardware', { componentType: 'ecu' }),
    ];
    // Edge defined target→source, but should still be traversable
    const edges = [makeEdge('ecu', 'gw')];

    const paths = computeAttackPaths(nodes, edges);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('excludes boundary nodes from paths', () => {
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('zone', 'boundary'),   // should be skipped
      makeNode('ecu', 'hardware', { componentType: 'ecu' }),
    ];
    const edges = [makeEdge('gw', 'zone'), makeEdge('zone', 'ecu'), makeEdge('gw', 'ecu')];

    const paths = computeAttackPaths(nodes, edges);
    for (const p of paths) {
      expect(p.nodeIds).not.toContain('zone');
    }
  });

  it('sorts paths by score descending', () => {
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('low', 'hardware'),                                               // no risks
      makeNode('high', 'hardware', { risks: [makeRisk(5, 5, 'critical')] }),    // max risk
      makeNode('ecu', 'hardware', { componentType: 'ecu' }),
    ];
    const edges = [
      makeEdge('gw', 'low'), makeEdge('low', 'ecu'),
      makeEdge('gw', 'high'), makeEdge('high', 'ecu'),
    ];

    const paths = computeAttackPaths(nodes, edges);
    for (let i = 1; i < paths.length; i++) {
      expect(paths[i - 1].score).toBeGreaterThanOrEqual(paths[i].score);
    }
  });

  it('returns at most 15 paths', () => {
    // Build a star topology: 1 gateway + 20 ECUs all directly connected
    const gw = makeNode('gw', 'hardware', { componentType: 'gateway' });
    const ecus = Array.from({ length: 20 }, (_, i) =>
      makeNode(`ecu${i}`, 'hardware', { componentType: 'ecu' }),
    );
    const edges = ecus.map((e) => makeEdge('gw', e.id));

    const paths = computeAttackPaths([gw, ...ecus], edges);
    expect(paths.length).toBeLessThanOrEqual(15);
  });

  it('deduplicates paths with identical node sequences', () => {
    // Two edges between same nodes would produce same path traversal
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('ecu', 'hardware', { componentType: 'ecu' }),
    ];
    const edges = [makeEdge('gw', 'ecu')];

    const paths = computeAttackPaths(nodes, edges);
    const keys = paths.map((p) => p.nodeIds.join('>'));
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('assigns correct riskLevel based on score', () => {
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('ecu', 'hardware', {
        componentType: 'ecu',
        risks: [makeRisk(5, 5, 'critical')],  // likelihood*impact = 25 → riskScore 1.0
        threats: [makeThreat(true), makeThreat(true), makeThreat(true), makeThreat(true), makeThreat(true)],
      }),
    ];
    const edges = [makeEdge('gw', 'ecu')];

    const paths = computeAttackPaths(nodes, edges);
    expect(paths.length).toBeGreaterThan(0);
    // Both hops have high danger → path score should be high
    expect(['critical', 'high']).toContain(paths[0].riskLevel);
  });

  it('hops include nodeId, nodeLabel, cweIds, risks', () => {
    const threat = makeThreat(true);
    const risk = makeRisk(3, 4);
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway', label: 'Gateway' }),
      makeNode('ecu', 'hardware', {
        componentType: 'ecu',
        label: 'ECU',
        threats: [threat],
        risks: [risk],
      }),
    ];
    const edges = [makeEdge('gw', 'ecu')];

    const paths = computeAttackPaths(nodes, edges);
    const ecuHop = paths[0].hops.find((h) => h.nodeId === 'ecu')!;
    expect(ecuHop.nodeLabel).toBe('ECU');
    expect(ecuHop.cweIds).toContain('CWE-79');
    expect(ecuHop.risks).toContain(risk);
  });

  it('falls back to first 3 nodes when no explicit entry points exist', () => {
    // No gateway/telematics/obd/network_service nodes
    const nodes = [
      makeNode('a', 'hardware', { componentType: 'ecu' }),
      makeNode('b', 'hardware', { componentType: 'ecu' }),
      makeNode('c', 'hardware', { componentType: 'actuator' }),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];

    const paths = computeAttackPaths(nodes, edges);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('does not recurse beyond MAX_DEPTH of 8', () => {
    // Chain of 12 nodes: gw → n1 → n2 → ... → n10 → ecu
    const gw = makeNode('gw', 'hardware', { componentType: 'gateway' });
    const mids = Array.from({ length: 10 }, (_, i) => makeNode(`m${i}`, 'hardware'));
    const ecu = makeNode('ecu', 'hardware', { componentType: 'ecu' });
    const chain = [gw, ...mids, ecu];
    const edges: DiagramEdge[] = [];
    for (let i = 0; i < chain.length - 1; i++) {
      edges.push(makeEdge(chain[i].id, chain[i + 1].id));
    }

    const paths = computeAttackPaths(chain, edges);
    for (const p of paths) {
      expect(p.nodeIds.length).toBeLessThanOrEqual(8);
    }
  });
});

// ─── Score helpers (tested via computeAttackPaths outputs) ────────────────────

describe('score and riskLevel mapping', () => {
  it('riskLevel is "low" when node has no risks (default baseline 0.25)', () => {
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('target', 'hardware', { componentType: 'ecu' }),
    ];
    const edges = [makeEdge('gw', 'target')];

    const paths = computeAttackPaths(nodes, edges);
    expect(paths.length).toBeGreaterThan(0);
    // baseline dangerScore 0.25 for both hops → avg 0.25, score ~25 → 'low'
    expect(paths[0].riskLevel).toBe('low');
  });

  it('score is between 0 and 100', () => {
    const nodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway', risks: [makeRisk(5, 5, 'critical')] }),
      makeNode('ecu', 'hardware', { componentType: 'ecu', risks: [makeRisk(5, 5, 'critical')] }),
    ];
    const edges = [makeEdge('gw', 'ecu')];

    const paths = computeAttackPaths(nodes, edges);
    for (const p of paths) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    }
  });

  it('CWE threats increase danger score (higher score than identical node without CWE)', () => {
    const baseNodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('ecu', 'hardware', { componentType: 'ecu', risks: [makeRisk(3, 3)] }),
    ];
    const cweNodes = [
      makeNode('gw', 'hardware', { componentType: 'gateway' }),
      makeNode('ecu', 'hardware', {
        componentType: 'ecu',
        risks: [makeRisk(3, 3)],
        threats: [makeThreat(true), makeThreat(true), makeThreat(true)],
      }),
    ];
    const edges = [makeEdge('gw', 'ecu')];

    const basePaths = computeAttackPaths(baseNodes, edges);
    const cwePaths = computeAttackPaths(cweNodes, edges);

    expect(cwePaths[0].score).toBeGreaterThan(basePaths[0].score);
  });
});
