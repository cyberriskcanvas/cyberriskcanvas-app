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
  updatedAt: string;
}

export type VulnStatus = 'open' | 'in_triage' | 'not_affected' | 'fixed';
