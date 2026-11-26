// Merges an imported diagram (src/utils/canvasJsonImport.ts) into the current one. The structure comes
// from the file; layout and risk analysis (threats, risks, measures, mappings, tests) stay. Nothing is
// deleted: elements of an earlier import (ids with the df- prefix) that the file no longer contains are
// flagged with importOrphan and reported by the architecture check (M12).
import type { DiagramEdge, DiagramNode, EdgeData, NodeData } from '@/types';

export const IMPORT_PREFIX = 'df-';
const NODE_FIELDS = ['label', 'componentType', 'boundaryType', 'securityLevel', 'version', 'description', 'exposure'] as const;
const EDGE_FIELDS = ['protocol', 'description', 'port', 'encrypted'] as const;

export interface MergeStats {
  /** new nodes and edges */
  added: number;
  updated: number;
  /** imported earlier, missing in this file */
  orphans: number;
}

interface Diagram { nodes: DiagramNode[]; edges: DiagramEdge[] }

function pick<T extends Record<string, unknown>>(target: T, from: Record<string, unknown> | undefined, keys: readonly string[]): T {
  const out: Record<string, unknown> = { ...target };
  delete out.importOrphan;
  for (const k of keys) if (from?.[k] !== undefined) out[k] = from[k];
  return out as T;
}

/** React Flow needs a parent before its children; keeps the order otherwise. */
function parentsFirst(nodes: DiagramNode[]): DiagramNode[] {
  const ids = new Set(nodes.map((n) => n.id));
  const placed = new Set<string>();
  const out: DiagramNode[] = [];
  let rest = nodes;
  while (rest.length > 0) {
    const ready = rest.filter((n) => !n.parentId || placed.has(n.parentId) || !ids.has(n.parentId));
    if (ready.length === 0) return [...out, ...rest]; // cycle: leave as is
    for (const n of ready) { out.push(n); placed.add(n.id); }
    rest = rest.filter((n) => !placed.has(n.id));
  }
  return out;
}

export function mergeImportedDiagram(current: Diagram, imported: Diagram): Diagram & { stats: MergeStats } {
  const stats: MergeStats = { added: 0, updated: 0, orphans: 0 };
  const importedNodes = new Map(imported.nodes.map((n) => [n.id, n]));
  const importedEdges = new Map(imported.edges.map((e) => [e.id, e]));
  const currentNodes = new Set(current.nodes.map((n) => n.id));
  const currentEdges = new Set(current.edges.map((e) => e.id));

  const nodes = current.nodes.map((n): DiagramNode => {
    const imp = importedNodes.get(n.id);
    if (!imp) {
      if (!n.id.startsWith(IMPORT_PREFIX)) return n;
      stats.orphans++;
      return n.data.importOrphan ? n : { ...n, data: { ...n.data, importOrphan: true } };
    }
    stats.updated++;
    const next: DiagramNode = { ...n, data: pick<NodeData>(n.data, imp.data, NODE_FIELDS) };
    if (n.type === 'boundary' && imp.style) next.style = { ...n.style, ...imp.style };
    if (imp.parentId !== n.parentId) {
      // moved to another zone: the old relative position means nothing there
      next.position = imp.position;
      if (imp.parentId) next.parentId = imp.parentId;
      else delete next.parentId;
      delete next.extent;
    }
    return next;
  });
  for (const n of imported.nodes) {
    if (currentNodes.has(n.id)) continue;
    stats.added++;
    nodes.push(n);
  }

  const edges = current.edges.map((e): DiagramEdge => {
    const imp = importedEdges.get(e.id);
    if (!imp) {
      if (!e.id.startsWith(IMPORT_PREFIX)) return e;
      stats.orphans++;
      return e.data?.importOrphan ? e : { ...e, data: { ...e.data, importOrphan: true } };
    }
    stats.updated++;
    return { ...e, ...(imp.label !== undefined && { label: imp.label }), data: pick<EdgeData>(e.data ?? {}, imp.data, EDGE_FIELDS) };
  });
  for (const e of imported.edges) {
    if (currentEdges.has(e.id)) continue;
    stats.added++;
    edges.push(e);
  }

  return { nodes: parentsFirst(nodes), edges, stats };
}
