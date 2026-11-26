// Import of a diagram exported by another tool (e.g. the Digital Fabric zone planner):
// { format: 'cyberrisk-canvas-diagram', version: 1 | 2, source?, nodes, edges } in the canvas' own node/edge shape.
// The file is untrusted input: shape and references are checked, and only the structural fields listed
// below are kept. The risk analysis (threats, measures, mappings) never comes from the file.
import type { BoundaryType, DiagramEdge, DiagramNode, EdgeData, HardwareComponentType, NodeData, SoftwareComponentType } from '@/types';

export const CANVAS_JSON_FORMAT = 'cyberrisk-canvas-diagram';
const MAX_BYTES = 5_000_000;
const MAX_NODES = 2000;
const MAX_EDGES = 10000;
const MAX_SIZE = 50_000;
const NODE_TYPES = new Set(['hardware', 'software', 'boundary', 'note']);
const COMPONENT_TYPES = new Set<HardwareComponentType | SoftwareComponentType>([
  'ecu', 'sensor', 'actuator', 'gateway', 'hsm', 'obd', 'telematics', 'plc', 'hmi', 'historian', 'rtu', 'custom',
  'os', 'firmware', 'application', 'library', 'network_service', 'bootloader',
]);
const BOUNDARY_TYPES = new Set<BoundaryType>(['trust-zone', 'network-segment', 'physical-zone', 'logical-zone', 'cloud-zone']);
const SECURITY_LEVELS = new Set(['SL-1', 'SL-2', 'SL-3', 'SL-4']);
const EXPOSURES = new Set(['internet', 'local-network', 'physical', 'none']);

/** Where the file comes from (version 2); shown in the import preview. */
export interface CanvasJsonSource {
  tool: string;
  projectId: string | null;
  projectName: string;
  exportedAt: string;
  hash: string;
  release?: string;
  scope?: 'all' | 'supply';
}

export type CanvasJsonResult =
  | { ok: true; nodes: DiagramNode[]; edges: DiagramEdge[]; source: CanvasJsonSource | null }
  | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);
const size = (v: unknown) => (isFiniteNumber(v) && v > 0 && v <= MAX_SIZE ? v : undefined);

function parseSource(v: unknown): CanvasJsonSource | null | 'invalid' {
  if (v === undefined) return null;
  if (!isObject(v) || typeof v.tool !== 'string' || typeof v.projectName !== 'string' || typeof v.exportedAt !== 'string' || typeof v.hash !== 'string') return 'invalid';
  if (v.projectId !== null && typeof v.projectId !== 'string') return 'invalid';
  if (v.release !== undefined && typeof v.release !== 'string') return 'invalid';
  if (v.scope !== undefined && v.scope !== 'all' && v.scope !== 'supply') return 'invalid';
  if (!/^[0-9a-f]{0,64}$/.test(v.hash)) return 'invalid';
  return {
    tool: v.tool.slice(0, 50),
    projectId: v.projectId === null ? null : v.projectId.slice(0, 100),
    projectName: v.projectName.slice(0, 200),
    exportedAt: v.exportedAt.slice(0, 40),
    hash: v.hash,
    ...(v.release !== undefined && { release: v.release.slice(0, 100) }),
    ...(v.scope !== undefined && { scope: v.scope }),
  };
}

function cleanNodeData(d: Record<string, unknown>): NodeData {
  const data: NodeData = { label: String(d.label).slice(0, 200) };
  if (COMPONENT_TYPES.has(d.componentType as HardwareComponentType)) data.componentType = d.componentType as HardwareComponentType;
  if (BOUNDARY_TYPES.has(d.boundaryType as BoundaryType)) data.boundaryType = d.boundaryType as BoundaryType;
  if (SECURITY_LEVELS.has(d.securityLevel as string)) data.securityLevel = d.securityLevel as NodeData['securityLevel'];
  if (EXPOSURES.has(d.exposure as string)) data.exposure = d.exposure as NodeData['exposure'];
  const version = str(d.version, 100);
  if (version) data.version = version;
  const description = str(d.description, 2000);
  if (description) data.description = description;
  return data;
}

function cleanEdgeData(d: unknown): EdgeData | undefined {
  if (!isObject(d)) return undefined;
  const data: EdgeData = {};
  const protocol = str(d.protocol, 100);
  if (protocol) data.protocol = protocol;
  const description = str(d.description, 2000);
  if (description) data.description = description;
  if (Number.isInteger(d.port) && (d.port as number) >= 0 && (d.port as number) <= 65535) data.port = d.port as number;
  if (typeof d.encrypted === 'boolean') data.encrypted = d.encrypted;
  return data;
}

export function parseCanvasJson(text: string): CanvasJsonResult {
  if (text.length > MAX_BYTES) return { ok: false, error: 'file too large' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not valid JSON' };
  }
  if (!isObject(raw) || raw.format !== CANVAS_JSON_FORMAT || (raw.version !== 1 && raw.version !== 2)) return { ok: false, error: 'unknown format or version' };
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return { ok: false, error: 'nodes/edges missing' };
  if (raw.nodes.length > MAX_NODES || raw.edges.length > MAX_EDGES) return { ok: false, error: 'too many elements' };
  const source = raw.version === 2 ? parseSource(raw.source) : null;
  if (source === 'invalid') return { ok: false, error: 'invalid source' };

  const nodeIds = new Map<string, string>(); // id -> type; parents must appear before their children
  const nodes: DiagramNode[] = [];
  for (const [i, n] of raw.nodes.entries()) {
    if (!isObject(n) || typeof n.id !== 'string' || !n.id || n.id.length > 200) return { ok: false, error: `node ${i}: id missing` };
    if (nodeIds.has(n.id)) return { ok: false, error: `duplicate node id ${n.id}` };
    if (typeof n.type !== 'string' || !NODE_TYPES.has(n.type)) return { ok: false, error: `node ${n.id}: unknown type` };
    if (!isObject(n.position) || !isFiniteNumber(n.position.x) || !isFiniteNumber(n.position.y)) return { ok: false, error: `node ${n.id}: invalid position` };
    if (!isObject(n.data) || typeof n.data.label !== 'string') return { ok: false, error: `node ${n.id}: label missing` };
    if (n.parentId !== undefined && (typeof n.parentId !== 'string' || nodeIds.get(n.parentId) !== 'boundary')) return { ok: false, error: `node ${n.id}: parent must be an earlier boundary` };
    nodeIds.set(n.id, n.type);
    const style = isObject(n.style) ? { width: size(n.style.width), height: size(n.style.height) } : undefined;
    nodes.push({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      ...(n.parentId !== undefined && { parentId: n.parentId as string }),
      ...(style?.width && style.height && { style: { width: style.width, height: style.height } }),
      data: cleanNodeData(n.data),
    });
  }
  const edgeIds = new Set<string>();
  const edges: DiagramEdge[] = [];
  for (const [i, e] of raw.edges.entries()) {
    if (!isObject(e) || typeof e.id !== 'string' || !e.id || e.id.length > 200) return { ok: false, error: `edge ${i}: id missing` };
    if (edgeIds.has(e.id)) return { ok: false, error: `duplicate edge id ${e.id}` };
    if (typeof e.source !== 'string' || typeof e.target !== 'string' || !nodeIds.has(e.source) || !nodeIds.has(e.target)) return { ok: false, error: `edge ${e.id}: unknown source or target` };
    edgeIds.add(e.id);
    const label = str(e.label, 200);
    const data = cleanEdgeData(e.data);
    edges.push({ id: e.id, source: e.source, target: e.target, ...(label && { label }), ...(data && { data }) });
  }
  return { ok: true, nodes, edges, source };
}
