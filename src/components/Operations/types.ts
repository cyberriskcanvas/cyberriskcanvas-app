export interface SbomMeta {
  id: string;
  fileName: string;
  format: string;
  componentCount: number;
  uploadedAt: string;
}

export interface Vulnerability {
  id: string;
  osvId: string;
  cveId: string | null;
  summary: string | null;
  severity: string | null;
  cvssScore: number | null;
  componentName: string;
  componentVersion: string | null;
  componentPurl: string | null;
  status: string;
  justification: string | null;
  remediationCategory?: string | null;
  remediationDetails?: string | null;
  remediationUrl?: string | null;
  updatedAt: string;
  /** EPSS: probability of exploitation within 30 days (0..1). */
  epss?: number | null;
  /** Versions that fix it. */
  fixed?: string[];
  /** Accepted noise: hidden from the list and the counts, not blocking. */
  suppressed?: boolean;
  /** Listed as actively exploited (CISA KEV) while unresolved: an Art. 14 case exists. */
  exploited?: boolean;
}

export type VulnStatus = 'open' | 'in_triage' | 'affected' | 'not_affected' | 'fixed';

export type VulnUpdate = Pick<Vulnerability, 'id' | 'status' | 'justification' | 'remediationCategory' | 'remediationDetails' | 'remediationUrl' | 'suppressed' | 'updatedAt'>;
