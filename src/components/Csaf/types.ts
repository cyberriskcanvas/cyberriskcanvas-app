export interface CsafDraft {
  title: string;
  trackingId: string;
  version: string;
  revision: string;
  docStatus: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  aggregateSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  initialReleaseDate: string; // ISO
  currentReleaseDate: string; // ISO
  tlp: 'CLEAR' | 'GREEN' | 'AMBER' | 'AMBER+STRICT' | 'RED';
  summary: string;
  details: string;
  publisherName: string;
  publisherNamespace: string;
  publisherCategory: 'vendor' | 'coordinator' | 'discoverer' | 'other' | 'multiplier' | 'translator' | 'user';
  /** 2.0 = OASIS Standard, 2.1 = Committee Specification Draft (preview) */
  csafVersion: '2.0' | '2.1';
  /** SPDX license expression, CSAF 2.1 only */
  licenseExpression: string;
}

export interface TriageInfo {
  total: number;
  open: number;
  derivedSeverity: string;
}

export type WizardStep = 'gate' | 'metadata' | 'preview' | 'reporting';
