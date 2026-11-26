import type { Finding } from './findings';
import { vexResponse } from './remediation';

// CycloneDX 1.6 VEX (vulnerability exploitability exchange): the triage decisions of a product as a machine-readable file.

const STATE: Record<string, string> = { open: 'in_triage', in_triage: 'in_triage', affected: 'exploitable', not_affected: 'not_affected', fixed: 'resolved' };
const VERSION_STATUS: Record<string, string> = { affected: 'affected', not_affected: 'unaffected', fixed: 'unaffected' };

/** One entry per component and advisory, however many versions list it. Suppressed findings are left out. */
export function buildVex(projectName: string, findings: Finding[]) {
  const unique = new Map<string, Finding>();
  for (const f of findings) {
    if (!f.suppressed && !unique.has(`${f.componentKey}\u0000${f.osvId}`)) unique.set(`${f.componentKey}\u0000${f.osvId}`, f);
  }
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: { components: [{ type: 'application', author: 'CyberRisk Canvas', name: 'Operations Module' }] },
      component: { type: 'application', name: projectName },
    },
    vulnerabilities: [...unique.values()].map((v) => {
      const response = v.status === 'affected' || v.status === 'fixed' ? vexResponse(v.remediationCategory) : undefined;
      const detail = [v.justification, v.remediationDetails, v.remediationUrl].filter(Boolean).join('\n');
      return {
        id: v.osvId,
        source: { name: 'OSV', url: `https://osv.dev/vulnerability/${v.osvId}` },
        ratings: v.cvssScore !== null
          ? [{ source: { name: 'OSV' }, score: v.cvssScore, severity: (v.severity ?? 'unknown').toLowerCase(), method: v.cvssVector?.startsWith('CVSS:3.1/') ? 'CVSSv31' : 'CVSSv3', ...(v.cvssVector ? { vector: v.cvssVector } : {}) }]
          : [],
        description: v.summary ?? undefined,
        recommendation: v.fixed.length > 0 ? `Update ${v.componentName} to ${v.fixed.join(' or ')}` : undefined,
        analysis: { state: STATE[v.status] ?? 'in_triage', ...(response ? { response } : {}), ...(detail ? { detail } : {}) },
        affects: [{ ref: v.componentPurl ?? v.componentName, versions: v.componentVersion ? [{ version: v.componentVersion, status: VERSION_STATUS[v.status] ?? 'unknown' }] : [] }],
      };
    }),
  };
}
