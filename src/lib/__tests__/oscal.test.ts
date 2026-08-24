import { describe, it, expect } from 'vitest';
import { generateOscalAssessmentResults } from '../oscal';
import type { DiagramSummary } from '@/utils/aggregateDiagram';

describe('NIST OSCAL v1.1.0 Assessment Results Generator', () => {
  const mockSummary: DiagramSummary = {
    components: [
      {
        id: 'node-1',
        label: 'Gateway Controller',
        type: 'hardware',
        data: {
          label: 'Gateway Controller',
          cra: [{ requirementId: 'ER.1', status: 'compliant', notes: 'Verified in pentest' }],
        },
      },
    ],
    assets: [],
    threats: [
      {
        id: 'th-1',
        name: 'Firmware Spoofing',
        stride: 'S',
        componentId: 'node-1',
        componentLabel: 'Gateway Controller',
        componentType: 'hardware',
      },
    ],
    risks: [
      {
        id: 'risk-1',
        threatId: 'th-1',
        threatName: 'Firmware Spoofing',
        threatStride: 'S',
        likelihood: 4,
        impact: 4,
        level: 'high',
        status: 'open',
        mitigation: 'Implement secure boot with hardware root-of-trust',
        componentId: 'node-1',
        componentLabel: 'Gateway Controller',
        componentType: 'hardware',
      },
    ],
    measures: [
      {
        id: 'm-1',
        title: 'Hardware Root-of-Trust',
        status: 'in-progress',
        componentId: 'node-1',
        componentLabel: 'Gateway Controller',
      },
    ],
    traceabilityRows: [],
    compliance: [],
    globalScore: null,
    craCompliance: [],
    craGlobalScore: 80,
    riskCounts: { high: 1 },
    measureCounts: { 'in-progress': 1 },
  };

  it('should generate valid OSCAL assessment-results JSON structure', () => {
    const oscal = generateOscalAssessmentResults(mockSummary, {
      projectName: 'Smart Grid Gateway',
      projectVersion: '1.3.0',
    });

    expect(oscal['assessment-results']).toBeDefined();
    const ar = oscal['assessment-results'] as Record<string, unknown>;

    expect(ar.uuid).toBeDefined();
    expect((ar.metadata as Record<string, unknown>)['oscal-version']).toBe('1.1.0');
    expect((ar.metadata as Record<string, unknown>).title).toContain('Smart Grid Gateway');

    const results = ar.results as Array<Record<string, unknown>>;
    expect(results.length).toBe(1);

    const firstResult = results[0];
    expect((firstResult.observations as unknown[]).length).toBe(1);
    expect((firstResult.findings as unknown[]).length).toBe(1);

    const reviewedControls = (firstResult['reviewed-controls'] as Record<string, unknown>);
    expect(reviewedControls['control-objective-verifications']).toBeDefined();
  });
});
