export interface CsafDraft {
  title: string;
  trackingId: string;
  version: string;
  revision: string;
  docStatus: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  aggregateSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  initialReleaseDate: string; // ISO
  currentReleaseDate: string; // ISO
  tlp: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
  summary: string;
  details: string;
  publisherName: string;
  publisherNamespace: string;
  publisherCategory: 'vendor' | 'coordinator' | 'discoverer' | 'other';
}

export interface TriageInfo {
  total: number;
  open: number;
  derivedSeverity: string;
}

export type WizardStep = 'gate' | 'metadata' | 'preview';
