export interface MeasureTemplate {
  title: string;
  description: string;
  iecCategory: string; // IAC | UC | SI | DC | RDF | TRE | RA
  requirementIds: string[]; // linked IEC 62443 requirement IDs
}

export const MEASURE_TEMPLATES: MeasureTemplate[] = [
  // ─── IAC: Identification & Authentication Control ─────────────────────────
  {
    title: 'Enforce Strong Password Policy',
    description: 'Require minimum 12 characters, mixed case, digits and symbols. Block common passwords.',
    iecCategory: 'IAC',
    requirementIds: ['CR 1.7', 'SR 1.7'],
  },
  {
    title: 'Implement Multi-Factor Authentication',
    description: 'Require a second factor (TOTP, hardware token) for all privileged human users.',
    iecCategory: 'IAC',
    requirementIds: ['CR 1.1', 'SR 1.1'],
  },
  {
    title: 'Enforce Account Lockout After Failed Logins',
    description: 'Lock account for ≥15 minutes after 5 consecutive failed login attempts.',
    iecCategory: 'IAC',
    requirementIds: ['CR 1.11'],
  },
  {
    title: 'Establish PKI for Device Authentication',
    description: 'Issue X.509 certificates per device. Validate certificate chain before any trusted communication.',
    iecCategory: 'IAC',
    requirementIds: ['CR 1.8', 'CR 1.9'],
  },
  {
    title: 'Restrict Access via Untrusted Networks',
    description: 'Require VPN with mutual TLS for all remote access. Block direct exposure to internet.',
    iecCategory: 'IAC',
    requirementIds: ['CR 1.13'],
  },

  // ─── UC: Use Control ──────────────────────────────────────────────────────
  {
    title: 'Apply Principle of Least Privilege',
    description: 'Assign only the minimum permissions required for each role. Review and revoke excess rights quarterly.',
    iecCategory: 'UC',
    requirementIds: ['CR 2.1', 'SR 2.1'],
  },
  {
    title: 'Enable and Review Audit Logs',
    description: 'Log all authentication events, privilege escalations and configuration changes. Review weekly.',
    iecCategory: 'UC',
    requirementIds: ['CR 2.8', 'CR 2.9', 'SR 2.8'],
  },
  {
    title: 'Configure Session Timeout',
    description: 'Automatically lock or terminate sessions after 15 minutes of inactivity.',
    iecCategory: 'UC',
    requirementIds: ['CR 2.5'],
  },

  // ─── SI: System Integrity ─────────────────────────────────────────────────
  {
    title: 'Enable Secure Boot / Code Signing',
    description: 'Verify firmware/software signature using a hardware-rooted trust anchor before execution.',
    iecCategory: 'SI',
    requirementIds: ['CR 3.3', 'CR 3.4'],
  },
  {
    title: 'Implement Communication Integrity (MAC/HMAC)',
    description: 'Apply message authentication codes on all inter-component communication to detect tampering.',
    iecCategory: 'SI',
    requirementIds: ['CR 3.1'],
  },
  {
    title: 'Deploy Anti-Malware / Allowlisting',
    description: 'Use application allowlisting to prevent execution of unauthorized code.',
    iecCategory: 'SI',
    requirementIds: ['CR 3.2'],
  },
  {
    title: 'Sanitize All Input at Trust Boundaries',
    description: 'Validate syntax, length and content of all externally received data. Reject malformed inputs.',
    iecCategory: 'SI',
    requirementIds: ['CR 3.5'],
  },

  // ─── DC: Data Confidentiality ─────────────────────────────────────────────
  {
    title: 'Encrypt Data at Rest',
    description: 'Apply AES-256 (or equivalent) encryption to sensitive data stored on device or database.',
    iecCategory: 'DC',
    requirementIds: ['CR 4.1'],
  },
  {
    title: 'Encrypt Data in Transit (TLS 1.3)',
    description: 'Enforce TLS 1.3 (minimum TLS 1.2) for all network communication. Disable legacy cipher suites.',
    iecCategory: 'DC',
    requirementIds: ['CR 4.1', 'CR 4.3'],
  },
  {
    title: 'Purge Memory After Use of Sensitive Data',
    description: 'Overwrite sensitive buffers (keys, passwords) immediately after use to prevent data remanence.',
    iecCategory: 'DC',
    requirementIds: ['CR 4.2'],
  },

  // ─── RDF: Restricted Data Flow ────────────────────────────────────────────
  {
    title: 'Implement Network Segmentation / Zones',
    description: 'Separate OT, IT and DMZ into distinct network zones with firewall-enforced boundaries.',
    iecCategory: 'RDF',
    requirementIds: ['CR 5.1', 'CR 5.2'],
  },
  {
    title: 'Configure Stateful Firewall at Zone Boundaries',
    description: 'Allow only explicitly whitelisted protocols and ports between zones. Default-deny all others.',
    iecCategory: 'RDF',
    requirementIds: ['CR 5.2'],
  },
  {
    title: 'Separate Safety and Business Logic',
    description: 'Run safety-critical control functions on isolated execution environment, separate from business apps.',
    iecCategory: 'RDF',
    requirementIds: ['CR 5.4'],
  },

  // ─── TRE: Timely Response to Events ──────────────────────────────────────
  {
    title: 'Deploy Centralised Log Management (SIEM)',
    description: 'Forward all security logs to a centralised SIEM. Configure alerts for high-priority events.',
    iecCategory: 'TRE',
    requirementIds: ['CR 6.1', 'CR 6.2'],
  },
  {
    title: 'Establish Security Incident Response Procedure',
    description: 'Document and test response playbooks for top 5 threat scenarios. Review annually.',
    iecCategory: 'TRE',
    requirementIds: ['CR 6.2'],
  },

  // ─── RA: Resource Availability ────────────────────────────────────────────
  {
    title: 'Implement DoS / Rate Limiting Protection',
    description: 'Configure ingress rate limits per source IP. Enable graceful degradation mode under load.',
    iecCategory: 'RA',
    requirementIds: ['CR 7.1', 'CR 7.2'],
  },
  {
    title: 'Configure Automated Backup and Recovery',
    description: 'Schedule daily encrypted backups. Test full restore procedure quarterly. Target RTO ≤ 4 h.',
    iecCategory: 'RA',
    requirementIds: ['CR 7.3'],
  },
  {
    title: 'Disable Unnecessary Services and Ports',
    description: 'Enumerate all running services and open ports. Disable or remove everything not required.',
    iecCategory: 'RA',
    requirementIds: ['CR 7.7'],
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  IAC: 'Auth & Identity',
  UC: 'Use Control',
  SI: 'System Integrity',
  DC: 'Confidentiality',
  RDF: 'Data Flow',
  TRE: 'Event Response',
  RA: 'Availability',
};

export const IEC_CATEGORIES = ['IAC', 'UC', 'SI', 'DC', 'RDF', 'TRE', 'RA'] as const;
