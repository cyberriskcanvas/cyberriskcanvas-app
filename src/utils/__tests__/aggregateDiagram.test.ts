import { describe, it, expect } from 'vitest';
import { aggregateDiagram } from '../aggregateDiagram';
import { getRequirementsForSL } from '@/data/iec62443';
import type { DiagramNode, NodeData, Asset, Threat, Risk, Measure, IEC62443Mapping } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, type: string, data: Partial<NodeData> = {}): DiagramNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, ...data },
  } as DiagramNode;
}

function makeAsset(id: string, category: Asset['category'] = 'operational'): Asset {
  return { id, name: `Asset ${id}`, category };
}

function makeThreat(id: string): Threat {
  return { id, name: `Threat ${id}`, stride: 'T' };
}

function makeRisk(id: string, threatId: string, level: Risk['level'] = 'medium'): Risk {
  return { id, threatId, likelihood: 3, impact: 3, level, status: 'open' };
}

function makeMeasure(id: string, riskId?: string): Measure {
  return { id, title: `Measure ${id}`, status: 'open', riskId };
}

// ─── aggregateDiagram ─────────────────────────────────────────────────────────

describe('aggregateDiagram - empty input', () => {
  it('returns empty collections for empty node list', () => {
    const result = aggregateDiagram([]);
    expect(result.components).toHaveLength(0);
    expect(result.assets).toHaveLength(0);
    expect(result.threats).toHaveLength(0);
    expect(result.risks).toHaveLength(0);
    expect(result.measures).toHaveLength(0);
    expect(result.globalScore).toBeNull();
    expect(result.craGlobalScore).toBeNull();
  });

  it('returns zero riskCounts', () => {
    const result = aggregateDiagram([]);
    expect(result.riskCounts).toEqual({ critical: 0, high: 0, medium: 0, low: 0, negligible: 0 });
  });
});

describe('aggregateDiagram - boundary nodes are skipped', () => {
  it('does not include boundary nodes in components', () => {
    const nodes = [
      makeNode('zone', 'boundary'),
      makeNode('ecu', 'hardware'),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe('ecu');
  });

  it('does not flatten assets from boundary nodes', () => {
    const nodes = [
      makeNode('zone', 'boundary', { assets: [makeAsset('a1')] }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.assets).toHaveLength(0);
  });
});

describe('aggregateDiagram - asset flattening', () => {
  it('flattens assets from multiple nodes', () => {
    const nodes = [
      makeNode('n1', 'hardware', { assets: [makeAsset('a1'), makeAsset('a2')] }),
      makeNode('n2', 'software', { assets: [makeAsset('a3')] }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.assets).toHaveLength(3);
  });

  it('enriches each asset with componentId and componentLabel', () => {
    const nodes = [
      makeNode('ecuid', 'hardware', { label: 'My ECU', assets: [makeAsset('a1')] }),
    ];
    const result = aggregateDiagram(nodes);
    const asset = result.assets[0];
    expect(asset.componentId).toBe('ecuid');
    expect(asset.componentLabel).toBe('My ECU');
    expect(asset.componentType).toBe('hardware');
  });
});

describe('aggregateDiagram - threat and risk flattening', () => {
  it('flattens threats with component context', () => {
    const nodes = [
      makeNode('n1', 'hardware', { threats: [makeThreat('t1'), makeThreat('t2')] }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.threats).toHaveLength(2);
    expect(result.threats[0].componentId).toBe('n1');
  });

  it('resolves threat name and STRIDE on flattened risks', () => {
    const threat = makeThreat('t1');
    const risk = makeRisk('r1', 't1', 'high');
    const nodes = [
      makeNode('n1', 'hardware', { threats: [threat], risks: [risk] }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.risks[0].threatName).toBe('Threat t1');
    expect(result.risks[0].threatStride).toBe('T');
  });

  it('sets threatName to undefined when threatId has no matching threat', () => {
    const risk = makeRisk('r1', 'ghost', 'low');
    const nodes = [
      makeNode('n1', 'hardware', { risks: [risk] }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.risks[0].threatName).toBeUndefined();
  });

  it('counts risks by level in riskCounts', () => {
    const nodes = [
      makeNode('n1', 'hardware', {
        risks: [
          makeRisk('r1', 't1', 'critical'),
          makeRisk('r2', 't1', 'critical'),
          makeRisk('r3', 't1', 'high'),
          makeRisk('r4', 't1', 'low'),
        ],
      }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.riskCounts.critical).toBe(2);
    expect(result.riskCounts.high).toBe(1);
    expect(result.riskCounts.low).toBe(1);
    expect(result.riskCounts.medium).toBe(0);
  });
});

describe('aggregateDiagram - measure flattening & counts', () => {
  it('flattens measures with componentLabel', () => {
    const nodes = [
      makeNode('n1', 'hardware', { label: 'ECU', measures: [makeMeasure('m1'), makeMeasure('m2')] }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.measures).toHaveLength(2);
    expect(result.measures[0].componentLabel).toBe('ECU');
  });

  it('counts measures by status', () => {
    const nodes = [
      makeNode('n1', 'hardware', {
        measures: [
          { ...makeMeasure('m1'), status: 'open' },
          { ...makeMeasure('m2'), status: 'in-progress' },
          { ...makeMeasure('m3'), status: 'mitigated' },
          { ...makeMeasure('m4'), status: 'mitigated' },
        ],
      }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.measureCounts.open).toBe(1);
    expect(result.measureCounts['in-progress']).toBe(1);
    expect(result.measureCounts.mitigated).toBe(2);
  });
});

describe('aggregateDiagram - traceability rows', () => {
  it('links measure → risk → threat in traceability row', () => {
    const threat = makeThreat('t1');
    const risk = makeRisk('r1', 't1', 'high');
    const measure = makeMeasure('m1', 'r1');
    const nodes = [
      makeNode('n1', 'hardware', { threats: [threat], risks: [risk], measures: [measure] }),
    ];
    const result = aggregateDiagram(nodes);
    const row = result.traceabilityRows[0];
    expect(row.measureId).toBe('m1');
    expect(row.threatName).toBe('Threat t1');
    expect(row.riskLevel).toBe('high');
    expect(row.componentLabel).toBe('n1');
  });

  it('uses em-dash placeholders when measure has no linked risk/threat', () => {
    const nodes = [
      makeNode('n1', 'hardware', { measures: [makeMeasure('m1')] }),
    ];
    const result = aggregateDiagram(nodes);
    const row = result.traceabilityRows[0];
    expect(row.threatName).toBe('-');
    expect(row.riskLevel).toBe('-');
  });

  it('marks measure complete when evidenceLink + title are present and not risk-accepted', () => {
    const nodes = [
      makeNode('n1', 'hardware', {
        measures: [{
          ...makeMeasure('m1'),
          title: 'Implement TLS',
          evidenceLink: 'https://jira/ticket/1',
          status: 'mitigated',
        }],
      }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.traceabilityRows[0].complete).toBe(true);
  });

  it('marks measure incomplete when evidenceLink is missing', () => {
    const nodes = [
      makeNode('n1', 'hardware', { measures: [makeMeasure('m1')] }),
    ];
    expect(aggregateDiagram(nodes).traceabilityRows[0].complete).toBe(false);
  });

  it('marks risk-accepted measure complete when acceptanceReason + acceptedBy set', () => {
    const nodes = [
      makeNode('n1', 'hardware', {
        measures: [{
          ...makeMeasure('m1'),
          riskAccepted: true,
          acceptanceReason: 'Cost too high',
          acceptedBy: 'Alice',
          status: 'risk-accepted',
        }],
      }),
    ];
    expect(aggregateDiagram(nodes).traceabilityRows[0].complete).toBe(true);
  });

  it('marks risk-accepted measure incomplete when acceptedBy is missing', () => {
    const nodes = [
      makeNode('n1', 'hardware', {
        measures: [{
          ...makeMeasure('m1'),
          riskAccepted: true,
          acceptanceReason: 'Cost too high',
          status: 'risk-accepted',
        }],
      }),
    ];
    expect(aggregateDiagram(nodes).traceabilityRows[0].complete).toBe(false);
  });
});

describe('aggregateDiagram - IEC 62443 compliance', () => {
  it('calculates compliance and global score for node with securityLevel', () => {
    const mappings: IEC62443Mapping[] = [
      { requirementId: 'CR 1.1', status: 'compliant' },
      { requirementId: 'CR 1.2', status: 'compliant' },
    ];
    const nodes = [
      makeNode('n1', 'hardware', { securityLevel: 'SL-1', iec62443: mappings }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.compliance).toHaveLength(1);
    expect(result.globalScore).not.toBeNull();
    expect(result.globalScore).toBeGreaterThanOrEqual(0);
    expect(result.globalScore).toBeLessThanOrEqual(100);
  });

  it('globalScore is null when no nodes have securityLevel', () => {
    const nodes = [makeNode('n1', 'hardware')];
    expect(aggregateDiagram(nodes).globalScore).toBeNull();
  });

  it('globalScore is average of per-component scores', () => {
    // Two nodes, both 100% compliant - average should be 100
    const fullMappings: IEC62443Mapping[] = getRequirementsForSL(1, '4-2').map((r) => ({
      requirementId: r.id,
      status: 'compliant' as const,
    }));
    const nodes = [
      makeNode('n1', 'hardware', { securityLevel: 'SL-1', iec62443: fullMappings }),
      makeNode('n2', 'hardware', { securityLevel: 'SL-1', iec62443: fullMappings }),
    ];
    const result = aggregateDiagram(nodes);
    expect(result.globalScore).toBe(100);
  });
});
