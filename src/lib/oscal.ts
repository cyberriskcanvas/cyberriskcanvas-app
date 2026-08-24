/**
 * NIST OSCAL Generator (Open Security Controls Assessment Language)
 * Version 1.1.0 JSON Schema Compliant
 *
 * Implements machine-readable assessment results export according to:
 * - BSI TR-03183-1 Section 7 (PwDE Controls in OSCAL)
 * - BSI TR-03183-H Section 5.10 (7.5.1-4 Documented Information)
 */

import type { DiagramSummary } from '@/utils/aggregateDiagram';
import { CRA_REQUIREMENTS, type ComplianceStatus } from '@/data/cra';

export interface OscalExportOptions {
  projectName: string;
  projectVersion?: string;
  assessorName?: string;
  assessorEmail?: string;
}

export function generateOscalAssessmentResults(
  summary: DiagramSummary,
  options: OscalExportOptions,
): Record<string, unknown> {
  const assessmentUuid = crypto.randomUUID();
  const now = new Date().toISOString();

  // Map CRA requirements to OSCAL reviewed-controls
  const controlEntries = CRA_REQUIREMENTS.map((req) => {
    // Check if any component mapped this requirement
    const compMappings = summary.components.flatMap((c) => {
      const d = c.data;
      const cra = (d.cra ?? []) as Array<{ requirementId: string; status: ComplianceStatus; notes?: string }>;
      return cra.filter((m) => m.requirementId === req.id || m.requirementId === req.legacyId);
    });

    const isCompliant = compMappings.some((m) => m.status === 'compliant');
    const isPartial = compMappings.some((m) => m.status === 'partial');
    const isNotApplicable = compMappings.some((m) => m.status === 'not-applicable');

    const statusValue = isCompliant
      ? 'satisfied'
      : isPartial
        ? 'partially-satisfied'
        : isNotApplicable
          ? 'not-applicable'
          : 'not-satisfied';

    return {
      'control-id': req.id,
      description: req.description,
      status: {
        state: statusValue,
      },
      props: [
        { name: 'cra-reference', value: req.craRef },
        { name: 'domain', value: req.domain },
        ...(req.bsiStandard ? [{ name: 'bsi-standard', value: req.bsiStandard }] : []),
      ],
    };
  });

  // Map Threats & Risks to OSCAL observations
  const observations = summary.risks.map((r) => ({
    uuid: crypto.randomUUID(),
    title: r.threatName ?? `Risk ${r.id.slice(0, 8)}`,
    description: `Likelihood: ${r.likelihood} | Impact: ${r.impact} | Level: ${r.level.toUpperCase()}${r.mitigation ? ` | Mitigation: ${r.mitigation}` : ''}`,
    collected: now,
    types: ['threat-risk-assessment'],
    props: [
      { name: 'component', value: r.componentLabel },
      { name: 'risk-level', value: r.level },
      { name: 'status', value: r.status },
      ...(r.bsiEnvironment ? [{ name: 'bsi-environment-interface', value: r.bsiEnvironment.interface ?? 'external_network' }] : []),
    ],
  }));

  // Map Measures to OSCAL findings
  const findings = summary.measures.map((m) => ({
    uuid: crypto.randomUUID(),
    title: m.title,
    description: m.description ?? m.title,
    collected: now,
    props: [
      { name: 'component', value: m.componentLabel },
      { name: 'status', value: m.status },
      ...(m.owner ? [{ name: 'owner', value: m.owner }] : []),
      ...(m.dueDate ? [{ name: 'due-date', value: m.dueDate }] : []),
      ...(m.riskAccepted ? [{ name: 'risk-accepted', value: 'true' }] : []),
      ...(m.acceptanceReason ? [{ name: 'acceptance-reason', value: m.acceptanceReason }] : []),
    ],
  }));

  return {
    'assessment-results': {
      uuid: assessmentUuid,
      metadata: {
        title: `Cyber Resilience Assessment Report: ${options.projectName}`,
        published: now,
        'last-modified': now,
        version: options.projectVersion ?? '1.3.0',
        'oscal-version': '1.1.0',
        parties: [
          {
            uuid: crypto.randomUUID(),
            type: 'organization',
            name: 'CyberRisk Canvas Assessment Engine',
          },
          ...(options.assessorName
            ? [
                {
                  uuid: crypto.randomUUID(),
                  type: 'person',
                  name: options.assessorName,
                  ...(options.assessorEmail ? { 'email-addresses': [options.assessorEmail] } : {}),
                },
              ]
            : []),
        ],
      },
      'import-ap': {
        href: 'https://github.com/tr-03183/tr-03183-1',
      },
      results: [
        {
          uuid: crypto.randomUUID(),
          title: `CRA & BSI TR-03183-1 Conformity Assessment for ${options.projectName}`,
          description: `Automated assessment of ${summary.components.length} components, ${summary.threats.length} threats, and ${summary.risks.length} risks.`,
          start: now,
          'reviewed-controls': {
            'control-selections': [
              {
                description: 'CRA Annex I Essential Requirements & BSI TR-03183-1 Controls',
                'include-controls': controlEntries.map((c) => ({ 'control-id': c['control-id'] })),
              },
            ],
            'control-objective-verifications': controlEntries,
          },
          observations,
          findings,
        },
      ],
    },
  };
}
