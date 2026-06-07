export type SLLevel = 1 | 2 | 3 | 4;
export type IECPart = '4-2' | '3-3';
export type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';

export interface IEC62443Requirement {
  id: string;           // e.g. "CR 1.1"
  title: string;
  description: string;
  category: string;
  minSL: SLLevel;       // applies from this SL upward
  part: IECPart;
}

// ─── IEC 62443-4-2 Component Requirements (CR) ───────────────────────────────

export const IEC62443_4_2: IEC62443Requirement[] = [
  // Category 1: Identification & Authentication Control
  { id: 'CR 1.1', title: 'Human User Identification and Authentication', description: 'All human users shall be identified and authenticated on the component before allowing access to the component or data.', category: 'IAC', minSL: 1, part: '4-2' },
  { id: 'CR 1.2', title: 'Software Process and Device Identification and Authentication', description: 'All software processes and devices shall be identified and authenticated before allowing access to the component.', category: 'IAC', minSL: 1, part: '4-2' },
  { id: 'CR 1.3', title: 'Account Management', description: 'The component shall provide the capability to manage all accounts by authorized administrators.', category: 'IAC', minSL: 1, part: '4-2' },
  { id: 'CR 1.4', title: 'Identifier Management', description: 'The component shall provide the capability to support management of identifiers.', category: 'IAC', minSL: 1, part: '4-2' },
  { id: 'CR 1.5', title: 'Authenticator Management', description: 'The component shall provide the capability to initialize, change, and manage all authenticators.', category: 'IAC', minSL: 1, part: '4-2' },
  { id: 'CR 1.6', title: 'Wireless Access Management', description: 'The component shall provide the capability to identify and authenticate all users who access the component via wireless interfaces.', category: 'IAC', minSL: 2, part: '4-2' },
  { id: 'CR 1.7', title: 'Strength of Passwords', description: 'The component shall provide the capability to enforce configurable password strength based on minimum length, character classes, etc.', category: 'IAC', minSL: 1, part: '4-2' },
  { id: 'CR 1.8', title: 'Public Key Infrastructure', description: 'The component shall provide the capability to operate within a PKI and to verify certificates.', category: 'IAC', minSL: 3, part: '4-2' },
  { id: 'CR 1.9', title: 'Strength of Public Key Authentication', description: 'The component shall provide the capability to use public key cryptography for authentication.', category: 'IAC', minSL: 3, part: '4-2' },
  { id: 'CR 1.11', title: 'Unsuccessful Login Attempts', description: 'The component shall enforce a limit on the number of consecutive invalid access attempts and lock the account for a configurable time.', category: 'IAC', minSL: 2, part: '4-2' },
  { id: 'CR 1.13', title: 'Access via Untrusted Networks', description: 'The component shall provide the capability to monitor and control all methods of access to the component via untrusted networks.', category: 'IAC', minSL: 2, part: '4-2' },
  { id: 'CR 1.14', title: 'Strength of Encryption', description: 'The component shall use encryption meeting minimum key-length and algorithm requirements.', category: 'IAC', minSL: 3, part: '4-2' },

  // Category 2: Use Control
  { id: 'CR 2.1', title: 'Authorization Enforcement', description: 'The component shall enforce authorizations assigned to all human users based on the principle of least privilege.', category: 'UC', minSL: 1, part: '4-2' },
  { id: 'CR 2.2', title: 'Wireless Use Control', description: 'The component shall provide the capability to authorize wireless connections based on policy.', category: 'UC', minSL: 2, part: '4-2' },
  { id: 'CR 2.4', title: 'Mobile Code', description: 'The component shall provide the capability to authorize, enforce, monitor, and log usage of mobile code.', category: 'UC', minSL: 2, part: '4-2' },
  { id: 'CR 2.5', title: 'Session Lock', description: 'The component shall provide the capability to prevent further access after a defined period of inactivity until re-authentication.', category: 'UC', minSL: 2, part: '4-2' },
  { id: 'CR 2.8', title: 'Auditable Events', description: 'The component shall provide the capability to generate audit records for defined auditable events.', category: 'UC', minSL: 1, part: '4-2' },
  { id: 'CR 2.9', title: 'Audit Storage Capacity', description: 'The component shall provide the capability to allocate audit record storage capacity.', category: 'UC', minSL: 1, part: '4-2' },
  { id: 'CR 2.11', title: 'Timestamps', description: 'The component shall provide timestamps for use in audit record generation.', category: 'UC', minSL: 1, part: '4-2' },
  { id: 'CR 2.12', title: 'Non-Repudiation', description: 'The component shall provide the capability to determine whether a given individual took a particular action.', category: 'UC', minSL: 3, part: '4-2' },

  // Category 3: System Integrity
  { id: 'CR 3.1', title: 'Communication Integrity', description: 'The component shall use industry-accepted communication integrity mechanisms to ensure data is not modified during transmission.', category: 'SI', minSL: 1, part: '4-2' },
  { id: 'CR 3.2', title: 'Protection from Malicious Code', description: 'The component shall provide the capability to employ protection mechanisms to prevent, detect, report, and mitigate malicious code.', category: 'SI', minSL: 2, part: '4-2' },
  { id: 'CR 3.3', title: 'Security Functionality Verification', description: 'The component shall provide the capability to support verification of security functionality.', category: 'SI', minSL: 1, part: '4-2' },
  { id: 'CR 3.4', title: 'Software and Information Integrity', description: 'The component shall provide the capability to detect and report unauthorized changes to software and firmware.', category: 'SI', minSL: 2, part: '4-2' },
  { id: 'CR 3.5', title: 'Input Validation', description: 'The component shall validate the syntax and content of any input used as a security decision point.', category: 'SI', minSL: 1, part: '4-2' },
  { id: 'CR 3.7', title: 'Error Handling', description: 'The component shall restrict the error information available to the interface to only the error message.', category: 'SI', minSL: 1, part: '4-2' },
  { id: 'CR 3.9', title: 'Protection of Audit Information', description: 'The component shall protect audit information and audit tools from unauthorized access, modification, and deletion.', category: 'SI', minSL: 2, part: '4-2' },

  // Category 4: Data Confidentiality
  { id: 'CR 4.1', title: 'Information Confidentiality', description: 'The component shall protect the confidentiality of information at rest and in transit.', category: 'DC', minSL: 2, part: '4-2' },
  { id: 'CR 4.2', title: 'Information Persistence', description: 'The component shall prevent the unauthorized exposure of information through the reuse of shared memory resources.', category: 'DC', minSL: 3, part: '4-2' },
  { id: 'CR 4.3', title: 'Use of Cryptography', description: 'The component shall use cryptography in accordance with applicable laws, regulations, and standards.', category: 'DC', minSL: 2, part: '4-2' },

  // Category 5: Restricted Data Flow
  { id: 'CR 5.1', title: 'Network Segmentation', description: 'The component shall provide the capability to logically segment network communications of components.', category: 'RDF', minSL: 1, part: '4-2' },
  { id: 'CR 5.2', title: 'Zone Boundary Protection', description: 'The component shall monitor and control communications at zone boundaries to enforce the compartmentalization defined in the risk-based zones and conduits model.', category: 'RDF', minSL: 1, part: '4-2' },
  { id: 'CR 5.4', title: 'Application Partitioning', description: 'The component shall separate business functionality from control system functionality.', category: 'RDF', minSL: 2, part: '4-2' },

  // Category 6: Timely Response to Events
  { id: 'CR 6.1', title: 'Audit Log Accessibility', description: 'The component shall provide the capability to read all audit logs through a common interface.', category: 'TRE', minSL: 2, part: '4-2' },
  { id: 'CR 6.2', title: 'Continuous Monitoring', description: 'The component shall provide the capability to continuously monitor all security mechanisms.', category: 'TRE', minSL: 3, part: '4-2' },

  // Category 7: Resource Availability
  { id: 'CR 7.1', title: 'Denial of Service Protection', description: 'The component shall provide the capability to operate in a degraded mode during a denial of service event.', category: 'RA', minSL: 2, part: '4-2' },
  { id: 'CR 7.2', title: 'Resource Management', description: 'The component shall manage and limit the use of resources to prevent resource exhaustion.', category: 'RA', minSL: 2, part: '4-2' },
  { id: 'CR 7.3', title: 'Control System Backup', description: 'The component shall provide the capability to back up the information, including system state, necessary to recover from a failure.', category: 'RA', minSL: 1, part: '4-2' },
  { id: 'CR 7.6', title: 'Network and Security Configuration Settings', description: 'The component shall provide the capability to report current security-related configuration settings.', category: 'RA', minSL: 2, part: '4-2' },
  { id: 'CR 7.7', title: 'Least Functionality', description: 'The component shall provide only the capabilities needed to support the IACS application.', category: 'RA', minSL: 1, part: '4-2' },
];

// ─── IEC 62443-3-3 System Requirements (SR) ──────────────────────────────────
// Selected key requirements

export const IEC62443_3_3: IEC62443Requirement[] = [
  { id: 'SR 1.1', title: 'Human User Identification and Authentication', description: 'The control system shall provide the capability to identify and authenticate all human users.', category: 'IAC', minSL: 1, part: '3-3' },
  { id: 'SR 1.3', title: 'Account Management', description: 'The control system shall provide the capability to manage all accounts by authorized administrators.', category: 'IAC', minSL: 1, part: '3-3' },
  { id: 'SR 1.7', title: 'Strength of Passwords', description: 'The control system shall enforce configurable password strength.', category: 'IAC', minSL: 1, part: '3-3' },
  { id: 'SR 2.1', title: 'Authorization Enforcement', description: 'The control system shall enforce authorizations based on the principle of least privilege.', category: 'UC', minSL: 1, part: '3-3' },
  { id: 'SR 2.8', title: 'Auditable Events', description: 'The control system shall generate audit records for defined auditable events.', category: 'UC', minSL: 1, part: '3-3' },
  { id: 'SR 3.1', title: 'Communication Integrity', description: 'The control system shall use integrity mechanisms for communications.', category: 'SI', minSL: 1, part: '3-3' },
  { id: 'SR 3.3', title: 'Security Functionality Verification', description: 'The control system shall support verification of security functionality.', category: 'SI', minSL: 1, part: '3-3' },
  { id: 'SR 3.4', title: 'Software and Information Integrity', description: 'The control system shall detect and report unauthorized changes.', category: 'SI', minSL: 2, part: '3-3' },
  { id: 'SR 4.1', title: 'Information Confidentiality', description: 'The control system shall protect the confidentiality of information at rest and in transit.', category: 'DC', minSL: 2, part: '3-3' },
  { id: 'SR 5.1', title: 'Network Segmentation', description: 'The control system shall logically separate IACS network from non-IACS networks.', category: 'RDF', minSL: 1, part: '3-3' },
  { id: 'SR 5.2', title: 'Zone Boundary Protection', description: 'The control system shall monitor and control communications at zone boundaries.', category: 'RDF', minSL: 1, part: '3-3' },
  { id: 'SR 7.1', title: 'Denial of Service Protection', description: 'The control system shall operate in degraded mode during a DoS event.', category: 'RA', minSL: 2, part: '3-3' },
  { id: 'SR 7.3', title: 'Control System Backup', description: 'The control system shall support backup and recovery of system state.', category: 'RA', minSL: 1, part: '3-3' },
];

export const ALL_REQUIREMENTS = [...IEC62443_4_2, ...IEC62443_3_3];

// Get requirements applicable for a given SL and part
export function getRequirementsForSL(sl: SLLevel, part: IECPart): IEC62443Requirement[] {
  const source = part === '4-2' ? IEC62443_4_2 : IEC62443_3_3;
  return source.filter((r) => r.minSL <= sl);
}

// Calculate compliance score for a set of mappings
export interface ComplianceSummary {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  score: number; // 0-100
}

export function calculateCompliance(
  mappings: { requirementId: string; status: ComplianceStatus }[],
  requirements: IEC62443Requirement[],
): ComplianceSummary {
  const total = requirements.length;
  if (total === 0) return { total: 0, compliant: 0, partial: 0, nonCompliant: 0, score: 0 };

  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;

  for (const req of requirements) {
    const m = mappings.find((x) => x.requirementId === req.id);
    const status = m?.status ?? 'non-compliant';
    if (status === 'compliant') compliant++;
    else if (status === 'partial') partial++;
    else if (status === 'non-compliant') nonCompliant++;
  }

  const score = Math.round(((compliant + partial * 0.5) / total) * 100);
  return { total, compliant, partial, nonCompliant, score };
}

export const CATEGORY_LABELS: Record<string, string> = {
  IAC: 'Identification & Authentication',
  UC: 'Use Control',
  SI: 'System Integrity',
  DC: 'Data Confidentiality',
  RDF: 'Restricted Data Flow',
  TRE: 'Timely Response to Events',
  RA: 'Resource Availability',
};
