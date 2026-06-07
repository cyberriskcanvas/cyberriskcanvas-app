export type Tier = 'free' | 'pro';

export interface TierConfig {
  realtimeCollab: boolean;
  iec62443: boolean;
  export: boolean;
  auditPdf: boolean;
  versionFreeze: boolean;
  versions: boolean;
  baselines: boolean;
  documents: boolean;
  sbom: boolean;
  attackPaths: boolean;
  testGeneration: boolean;
  ai: boolean;
  whiteLabel: boolean;
  changelog: boolean;
  api: boolean;
  approvalWorkflow: boolean;
  sso: boolean;
  customFrameworks: boolean;
  /** Maximum number of projects. null = unlimited. */
  maxProjects: number | null;
  /** Maximum number of non-boundary nodes per diagram. null = unlimited. */
  maxNodes: number | null;
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  free: {
    realtimeCollab: true,
    iec62443: true,
    export: false,
    auditPdf: false,
    versionFreeze: false,
    versions: false,
    baselines: false,
    documents: false,
    sbom: false,
    attackPaths: false,
    testGeneration: false,
    ai: false,
    whiteLabel: false,
    changelog: false,
    api: false,
    approvalWorkflow: false,
    sso: false,
    customFrameworks: false,
    maxProjects: 3,
    maxNodes: 30,
  },
  pro: {
    realtimeCollab: true,
    iec62443: true,
    export: true,
    auditPdf: true,
    versionFreeze: true,
    versions: true,
    baselines: true,
    documents: true,
    sbom: true,
    attackPaths: true,
    testGeneration: true,
    ai: true,
    whiteLabel: true,
    changelog: true,
    api: true,
    approvalWorkflow: true,
    sso: true,
    customFrameworks: true,
    maxProjects: null,
    maxNodes: null,
  },
};
