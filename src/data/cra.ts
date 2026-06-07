export type CRADomain =
  | 'scope'
  | 'product_context'
  | 'secure_development'
  | 'risk_assessment'
  | 'vulnerability_handling'
  | 'user_transparency'
  | 'technical_documentation'
  | 'classification';

export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';

export interface CRARequirement {
  id: string;
  title: string;
  description: string;
  craRef: string;
  domain: CRADomain;
  critical?: boolean;
}

export const DOMAIN_LABELS: Record<CRADomain, string> = {
  scope: 'Scope Check',
  product_context: 'Product & Usage Context',
  secure_development: 'Secure Development & Product Security',
  risk_assessment: 'Cybersecurity Risk Assessment',
  vulnerability_handling: 'Vulnerability Handling & Support',
  user_transparency: 'User Information & Transparency',
  technical_documentation: 'Technical Documentation & Evidence',
  classification: 'Product Classification & Conformity Path',
};

export const CRA_REQUIREMENTS: CRARequirement[] = [
  // ── Scope ────────────────────────────────────────────────────────────────────
  {
    id: 'sc_02',
    title: 'Network Connectivity',
    description: 'The product connects to a network (internet, LAN, Bluetooth, Zigbee, or similar), making it a "product with digital elements" subject to the CRA.',
    craRef: 'Art. 2(1)',
    domain: 'scope',
  },
  {
    id: 'sc_03',
    title: 'Made Available on EU Market',
    description: 'The product is sold, licensed, or distributed (including free of charge) on the EU market.',
    craRef: 'Art. 2(1), Recital 15',
    domain: 'scope',
  },
  {
    id: 'sc_05',
    title: 'No Displacing Sector Regulation',
    description: 'The product is not fully covered by another EU sector regulation that displaces the CRA (e.g., MDR, automotive, aviation). Where overlap exists, a manual legal review is required.',
    craRef: 'Art. 2(2), Art. 2(3)',
    domain: 'scope',
  },

  // ── Product & Usage Context ───────────────────────────────────────────────
  {
    id: 'pc_02',
    title: 'Sensitive Data Handling',
    description: 'If the product processes, stores, or transmits sensitive data (personal data, credentials, financial data, OT data), explicit data-protection measures must be implemented per Annex I.',
    craRef: 'Annex I Part I, §1(h)',
    domain: 'product_context',
  },
  {
    id: 'pc_03',
    title: 'Remote Access Controls',
    description: 'Products with remote management or administration capabilities must implement access controls that address the expanded attack surface.',
    craRef: 'Annex I Part I, §1(d)',
    domain: 'product_context',
  },
  {
    id: 'pc_04',
    title: 'Third-Party / OSS Component Tracking',
    description: 'Third-party and open-source components must be identified, tracked, and monitored for known vulnerabilities. An SBOM is required under Annex VII.',
    craRef: 'Annex I Part I, §1(b); Annex VII §2(3)',
    domain: 'product_context',
  },

  // ── Secure Development & Product Security ────────────────────────────────
  {
    id: 'sd_01',
    title: 'Secure Development Lifecycle (SDL)',
    description: 'Products shall be designed with security by default and by design. A documented SDL is the primary evidence artefact for this requirement.',
    craRef: 'Annex I Part I, §1; Art. 13(1)',
    domain: 'secure_development',
    critical: true,
  },
  {
    id: 'sd_02',
    title: 'Automated Code Analysis (SAST / Dependency Scanning)',
    description: 'Automated security tooling (SAST, dependency scanning, secret detection) shall be part of the CI/CD pipeline.',
    craRef: 'Annex I Part I, §1(a)',
    domain: 'secure_development',
    critical: true,
  },
  {
    id: 'sd_03',
    title: 'Dynamic Security Testing (DAST / Pentest)',
    description: 'Dynamic testing (DAST, penetration testing, or fuzzing) shall be performed to validate security controls under realistic conditions.',
    craRef: 'Annex I Part I, §1(a)',
    domain: 'secure_development',
  },
  {
    id: 'sd_04',
    title: 'Minimal Attack Surface by Default',
    description: 'Unnecessary features, services, and network ports shall be disabled or removed by default.',
    craRef: 'Annex I Part I, §1(c)',
    domain: 'secure_development',
    critical: true,
  },
  {
    id: 'sd_05',
    title: 'No Insecure Default Credentials',
    description: 'The product shall enforce strong, unique default credentials or require users to set credentials on first use.',
    craRef: 'Annex I Part I, §1(e)',
    domain: 'secure_development',
    critical: true,
  },
  {
    id: 'sd_06',
    title: 'Encryption in Transit and at Rest',
    description: 'The product shall protect data in transit and at rest using appropriate cryptographic mechanisms (e.g., TLS 1.2+).',
    craRef: 'Annex I Part I, §1(h)',
    domain: 'secure_development',
    critical: true,
  },
  {
    id: 'sd_07',
    title: 'Secure Update Mechanism',
    description: 'The product shall support secure delivery of security updates with the update mechanism itself protected (e.g., signed updates).',
    craRef: 'Annex I Part I, §1(j), §2(7)',
    domain: 'secure_development',
    critical: true,
  },
  {
    id: 'sd_08',
    title: 'Security Logging & Audit Trails',
    description: 'The product shall generate security-relevant logs or audit trails accessible to the operator.',
    craRef: 'Annex I Part I, §1(k)',
    domain: 'secure_development',
  },
  {
    id: 'sd_09',
    title: 'Firmware / Boot Integrity (Secure Boot)',
    description: 'For hardware/firmware products: the product shall protect the integrity of its firmware / boot chain (e.g., Secure Boot, signed firmware).',
    craRef: 'Annex I Part I, §1(d)',
    domain: 'secure_development',
  },
  {
    id: 'sd_10',
    title: 'Availability Under Attack (DoS Resilience)',
    description: 'The product shall include measures to maintain availability under attack conditions (e.g., rate limiting, resource exhaustion protection).',
    craRef: 'Annex I Part I, §1(h)',
    domain: 'secure_development',
  },
  {
    id: 'sd_11',
    title: 'Secure Data Erasure (Factory Reset)',
    description: 'The product shall provide a secure way to erase user data and credentials before disposal or resale.',
    craRef: 'Annex I Part I, §1(i)',
    domain: 'secure_development',
  },

  // ── Cybersecurity Risk Assessment ────────────────────────────────────────
  {
    id: 'ra_01',
    title: 'Documented Cybersecurity Risk Assessment',
    description: 'A documented cybersecurity risk assessment shall be performed as the basis for security design decisions.',
    craRef: 'Art. 13(2), Annex VII §2(1)',
    domain: 'risk_assessment',
    critical: true,
  },
  {
    id: 'ra_02',
    title: 'Threat Model (Assets, Trust Boundaries, Attack Vectors)',
    description: 'The risk assessment shall include a threat model identifying assets, trust boundaries, attack vectors, and adversary profiles.',
    craRef: 'Art. 13(2), Annex I Part I §1',
    domain: 'risk_assessment',
    critical: true,
  },
  {
    id: 'ra_03',
    title: 'Supply Chain Risk in Assessment',
    description: 'Risks from third-party and open-source components shall be explicitly covered in the risk assessment.',
    craRef: 'Annex I Part I, §1(b); Annex VII §2(3)',
    domain: 'risk_assessment',
  },
  {
    id: 'ra_04',
    title: 'Periodic Risk Assessment Review',
    description: 'The risk assessment shall be reviewed and updated on significant product changes or at a defined periodic interval.',
    craRef: 'Art. 13(2)',
    domain: 'risk_assessment',
    critical: true,
  },
  {
    id: 'ra_05',
    title: 'Risk-to-Mitigation Traceability',
    description: 'Identified risks shall be tracked to specific mitigations, with documented rationale for any accepted residual risk.',
    craRef: 'Art. 13(2), Annex I Part I',
    domain: 'risk_assessment',
    critical: true,
  },
  {
    id: 'ra_06',
    title: 'Substantial Modification Re-Assessment Trigger',
    description: 'A documented process shall exist to re-run the risk assessment and conformity review whenever a substantial modification (Art. 3(32)) is introduced.',
    craRef: 'Art. 3(32), Art. 13(2), Art. 31',
    domain: 'risk_assessment',
    critical: true,
  },

  // ── Vulnerability Handling & Support ─────────────────────────────────────
  {
    id: 'vh_01',
    title: 'Vulnerability Disclosure Policy (VDP)',
    description: 'A documented, publicly accessible Vulnerability Disclosure Policy (VDP) shall exist (e.g., security.txt).',
    craRef: 'Annex I Part II, §1; Art. 13(6)',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_02',
    title: 'Internal Vulnerability Management Process',
    description: 'An internal process for triaging, assessing, and remediating reported or discovered vulnerabilities shall exist.',
    craRef: 'Annex I Part II, §2–4',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_03',
    title: 'CVE Monitoring for Dependencies',
    description: 'Known vulnerability databases (NVD, CVE, vendor advisories) shall be actively monitored for issues affecting third-party components.',
    craRef: 'Annex I Part II, §1',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_04',
    title: 'Security Advisories to Users',
    description: 'Security advisories shall be published to users when vulnerabilities in the product are confirmed and fixed.',
    craRef: 'Annex I Part II, §5; Art. 13(8)',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_05',
    title: 'Defined Support Period',
    description: 'A defined support period during which the product will receive security updates shall exist and be communicated publicly (minimum 5 years per Art. 13(8)).',
    craRef: 'Art. 13(8), Annex I Part II, §2(7)',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_06',
    title: 'ENISA/CSIRT 24h Early Warning (Art. 14)',
    description: 'A process shall exist to issue an early warning notification to the national CSIRT and ENISA within 24 hours of becoming aware of an actively exploited vulnerability.',
    craRef: 'Art. 14(2)(a)',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_13',
    title: 'ENISA/CSIRT 72h Follow-Up Notification',
    description: 'A process shall exist to issue a detailed vulnerability notification to the national CSIRT and ENISA within 72 hours of awareness.',
    craRef: 'Art. 14(2)(b)',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_14',
    title: 'ENISA/CSIRT 14-Day Final Report',
    description: 'A process shall exist to issue a final report to the national CSIRT and ENISA within 14 days of a corrective or mitigating measure becoming available.',
    craRef: 'Art. 14(2)(c)',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_15',
    title: 'Severe Incident Reporting (Art. 14(1)(b))',
    description: 'A process shall exist for reporting severe incidents impacting product security (e.g., breach of development/update infrastructure) to the national CSIRT and ENISA.',
    craRef: 'Art. 14(1)(b), Art. 14(3)',
    domain: 'vulnerability_handling',
    critical: true,
  },
  {
    id: 'vh_08',
    title: 'Machine-Readable Advisories (CSAF 2.0)',
    description: 'Security advisories should be published in CSAF 2.0 (machine-readable JSON format) per BSI TR-03183-3 expectations.',
    craRef: 'Annex I Part II, §5',
    domain: 'vulnerability_handling',
  },
  {
    id: 'vh_12',
    title: 'security.txt (RFC 9116)',
    description: 'A security.txt file per RFC 9116 shall be published at /.well-known/security.txt.',
    craRef: 'Annex I Part II, §1',
    domain: 'vulnerability_handling',
  },

  // ── User Information & Transparency ──────────────────────────────────────
  {
    id: 'ut_01',
    title: 'Security Setup & Hardening Documentation',
    description: 'Product documentation shall include security-relevant setup and hardening guidance for users (Annex II).',
    craRef: 'Annex II, §1–3',
    domain: 'user_transparency',
    critical: true,
  },
  {
    id: 'ut_02',
    title: 'Known Security Limitations Communicated',
    description: 'Known security limitations and intended use conditions shall be communicated clearly to users.',
    craRef: 'Annex II, §4',
    domain: 'user_transparency',
  },
  {
    id: 'ut_03',
    title: 'Vulnerability Reporting Instructions for Users',
    description: 'Clear, accessible instructions for users on how to report security vulnerabilities shall be provided.',
    craRef: 'Annex II, §5; Annex I Part II, §1',
    domain: 'user_transparency',
    critical: true,
  },
  {
    id: 'ut_04',
    title: 'Support Period Communicated to Users',
    description: 'The product\'s security update availability and support period shall be communicated clearly to users at point-of-sale and throughout the lifecycle.',
    craRef: 'Art. 13(8), Annex II §6',
    domain: 'user_transparency',
    critical: true,
  },
  {
    id: 'ut_05',
    title: 'EU Declaration of Conformity & CE Marking',
    description: 'Products subject to the CRA must bear the CE marking and be accompanied by an EU Declaration of Conformity.',
    craRef: 'Art. 28, Art. 30',
    domain: 'user_transparency',
  },

  // ── Technical Documentation & Evidence ───────────────────────────────────
  {
    id: 'td_01',
    title: 'Software Bill of Materials (SBOM)',
    description: 'An SBOM covering all software components including open-source dependencies shall be maintained in a machine-readable format (CycloneDX or SPDX per BSI TR-03183-2).',
    craRef: 'Annex VII §2(3); Annex I Part II §1',
    domain: 'technical_documentation',
    critical: true,
  },
  {
    id: 'td_02',
    title: 'Documented Security Requirements',
    description: 'Documented cybersecurity requirements (functional and non-functional) traceable to design decisions and test cases shall exist.',
    craRef: 'Annex VII §2(1)',
    domain: 'technical_documentation',
    critical: true,
  },
  {
    id: 'td_03',
    title: 'Security Testing Records',
    description: 'Records of security testing results (SAST, DAST, penetration tests, vulnerability scans) shall be maintained.',
    craRef: 'Annex VII §2(4)',
    domain: 'technical_documentation',
    critical: true,
  },
  {
    id: 'td_04',
    title: 'Security Architecture & Design Documentation',
    description: 'Documented design and architecture artefacts explaining security-relevant design decisions, trust boundaries, and the threat model shall exist.',
    craRef: 'Annex VII §2(2)',
    domain: 'technical_documentation',
  },
  {
    id: 'td_05',
    title: 'Alignment to Recognised Security Standard',
    description: 'The product references or aligns to a recognised security standard or framework (e.g., IEC 62443, OWASP ASVS, ETSI EN 303 645, NIST SP 800).',
    craRef: 'Art. 27',
    domain: 'technical_documentation',
  },
  {
    id: 'td_06',
    title: 'Annex VII Gap Analysis',
    description: 'A gap analysis of documentation against the CRA Annex VII requirements has been performed.',
    craRef: 'Annex VII',
    domain: 'technical_documentation',
  },

  // ── Product Classification & Conformity Path ─────────────────────────────
  {
    id: 'cl_01',
    title: 'Annex III Classification Reviewed',
    description: 'The product has been assessed against Annex III "Important Product" categories (Class I / Class II) which determine the conformity assessment route.',
    craRef: 'Annex III, Art. 8',
    domain: 'classification',
    critical: true,
  },
  {
    id: 'cl_02',
    title: 'Annex IV Critical Product Classification Reviewed',
    description: 'The product has been assessed against Annex IV "Critical Product" categories, which require a notified body assessment (no self-declaration permitted).',
    craRef: 'Annex IV, Art. 8(2)',
    domain: 'classification',
    critical: true,
  },
  {
    id: 'cl_05',
    title: 'CRA Conformity Roadmap',
    description: 'The expected effort and timeline for achieving CRA conformity have been assessed. CRA requirements apply from December 2027.',
    craRef: 'Art. 71',
    domain: 'classification',
  },
];

export function getRequirementsByDomain(): Record<CRADomain, CRARequirement[]> {
  const grouped = {} as Record<CRADomain, CRARequirement[]>;
  for (const req of CRA_REQUIREMENTS) {
    if (!grouped[req.domain]) grouped[req.domain] = [];
    grouped[req.domain].push(req);
  }
  return grouped;
}

export function calculateCRACompliance(
  mappings: { requirementId: string; status: ComplianceStatus }[],
  requirements: CRARequirement[],
): { score: number; compliant: number; partial: number; nonCompliant: number } {
  const applicable = requirements.filter((r) => {
    const m = mappings.find((m) => m.requirementId === r.id);
    return m?.status !== 'not-applicable';
  });

  if (applicable.length === 0) return { score: 0, compliant: 0, partial: 0, nonCompliant: 0 };

  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;

  for (const req of applicable) {
    const m = mappings.find((m) => m.requirementId === req.id);
    const status = m?.status ?? 'non-compliant';
    if (status === 'compliant') compliant++;
    else if (status === 'partial') partial++;
    else nonCompliant++;
  }

  const score = Math.round(((compliant + partial * 0.5) / applicable.length) * 100);
  return { score, compliant, partial, nonCompliant };
}
