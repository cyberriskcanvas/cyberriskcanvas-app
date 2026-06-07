import type { Node, Edge, Viewport } from '@xyflow/react';

// ─── Component Catalogue ─────────────────────────────────────────────────────

export type HardwareComponentType =
  | 'ecu' | 'sensor' | 'actuator' | 'gateway' | 'hsm' | 'obd' | 'telematics'
  | 'plc' | 'hmi' | 'historian' | 'rtu'
  | 'custom';

export type SoftwareComponentType =
  | 'os' | 'firmware' | 'application' | 'library' | 'network_service' | 'bootloader' | 'custom';

export type BoundaryType = 'trust-zone' | 'network-segment' | 'physical-zone' | 'logical-zone' | 'cloud-zone';

// ─── Assessment Data ──────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'privacy' | 'safety' | 'other';
  description?: string;
}

export interface Threat {
  id: string;
  name: string;
  stride: 'S' | 'T' | 'R' | 'I' | 'D' | 'E';
  cweId?: string;
  description?: string;
  source?: 'manual' | 'sbom' | 'ai';
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'negligible';

export interface Risk {
  id: string;
  threatId: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  level: RiskLevel;
  mitigation?: string;
  status: 'open' | 'in-progress' | 'mitigated';
}

export interface IEC62443Mapping {
  requirementId: string;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
  notes?: string;
}

export interface CRAMapping {
  requirementId: string;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
  notes?: string;
}

export interface Measure {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in-progress' | 'mitigated' | 'risk-accepted';
  riskId?: string;
  cweId?: string;
  owner?: string;
  dueDate?: string;
  evidenceLink?: string;
  evidenceFiles?: { id: string; name: string }[];
  riskAccepted?: boolean;
  acceptanceReason?: string;
  acceptedBy?: string;
}

// ─── Security Tests ───────────────────────────────────────────────────────────

export type SecurityTestStatus = 'untested' | 'passed' | 'failed';

export interface SecurityTest {
  id: string;
  title: string;
  targetComponent: string;
  precondition: string;
  testSteps: string[];
  expectedResult: string;
  status: SecurityTestStatus;
  threatId?: string;
  requirementId?: string;
  source: 'auto' | 'manual';
}

// ─── Single flexible node data type ──────────────────────────────────────────
// Using a single interface avoids discriminated-union issues with React Flow's
// applyNodeChanges() which re-creates node objects generically.

export interface NodeData extends Record<string, unknown> {
  label: string;
  // Hardware/Software component type
  componentType?: HardwareComponentType | SoftwareComponentType;
  // Boundary type
  boundaryType?: BoundaryType;
  // Optional metadata
  version?: string;
  description?: string;
  // Assessment fields
  assets?: Asset[];
  threats?: Threat[];
  risks?: Risk[];
  securityLevel?: 'SL-1' | 'SL-2' | 'SL-3' | 'SL-4';
  iec62443?: IEC62443Mapping[];
  cra?: CRAMapping[];
  measures?: Measure[];
  iecPart?: '4-2' | '3-3';
  securityTests?: SecurityTest[];
}

// Narrowed views used in node components for convenience
export interface HardwareNodeData extends NodeData {
  componentType: HardwareComponentType;
}
export interface SoftwareNodeData extends NodeData {
  componentType: SoftwareComponentType;
}
export interface BoundaryNodeData extends NodeData {
  boundaryType: BoundaryType;
}

// ─── React Flow types ─────────────────────────────────────────────────────────

// label holds the note text content
export type NoteNodeData = NodeData;

export type DiagramNode = Node<NodeData>;
export type HardwareNode = Node<HardwareNodeData, 'hardware'>;
export type SoftwareNode = Node<SoftwareNodeData, 'software'>;
export type BoundaryNode = Node<BoundaryNodeData, 'boundary'>;
export type NoteNode = Node<NoteNodeData, 'note'>;

export interface EdgeData {
  protocol?: string;
  port?: number;
  encrypted?: boolean;
  description?: string;
  [key: string]: unknown;
}

export type DiagramEdge = Edge<EdgeData>;

// ─── Project & Diagram ────────────────────────────────────────────────────────

export interface ProjectVersion {
  id: string;
  number: number;
  label: string;
  status: 'active' | 'frozen';
  frozenAt?: string | null;
  frozenByName?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  diagrams?: Diagram[];
  _count?: { diagrams: number };
  versions?: ProjectVersion[];
}

export interface Diagram {
  id: string;
  projectId: string;
  name: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: Viewport;
  createdAt: string;
  updatedAt: string;
}

// ─── Collaboration ────────────────────────────────────────────────────────────

export interface CollabUser {
  userId: string;
  username: string;
  color: string;
}

export interface CollabCursor extends CollabUser {
  x: number;
  y: number;
}

// ─── Sidebar drag data ────────────────────────────────────────────────────────

export interface DragData {
  nodeType: 'hardware' | 'software' | 'boundary' | 'note';
  componentType: HardwareComponentType | SoftwareComponentType | BoundaryType | 'note';
  label: string;
}

// ─── SBOM ─────────────────────────────────────────────────────────────────────

export interface SbomVulnerabilityData {
  id: string;
  osvId: string;
  cveId?: string | null;
  summary?: string | null;
  severity?: string | null;
  cvssScore?: number | null;
  source: string;
}

export interface SbomComponentData {
  id: string;
  name: string;
  version?: string | null;
  purl?: string | null;
  type?: string | null;
  createdAt: string;
  vulnerabilities: SbomVulnerabilityData[];
}

export interface SbomImportResult {
  componentCount: number;
  vulnCount: number;
  criticalCount: number;
  highCount: number;
  threatsCreated: number;
  components: SbomComponentData[];
}
