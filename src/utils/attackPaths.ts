import type { DiagramNode, DiagramEdge, NodeData, Risk, Threat } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttackPathHop {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  dangerScore: number; // 0..1
  risks: Risk[];
  cweIds: string[];
}

export interface AttackPath {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  entryNodeId: string;
  targetNodeId: string;
  /** 0–100, higher = more dangerous */
  score: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  hops: AttackPathHop[];
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

const ENTRY_POINT_TYPES = new Set([
  'gateway', 'telematics', 'obd', 'network_service', 'hmi', 'rtu',
]);

const CRITICAL_COMPONENT_TYPES = new Set([
  'ecu', 'hsm', 'actuator', 'os', 'firmware', 'plc', 'historian',
]);

function isEntryPoint(node: DiagramNode): boolean {
  const ct = (node.data as NodeData).componentType;
  return ct ? ENTRY_POINT_TYPES.has(ct) : false;
}

function isCriticalTarget(node: DiagramNode): boolean {
  if (node.type === 'boundary') return false;
  const data = node.data as NodeData;
  const hasSafetyAsset = (data.assets ?? []).some(
    (a) => a.category === 'safety' || a.category === 'financial',
  );
  const hasHighRisk = (data.risks ?? []).some(
    (r) => r.level === 'critical' || r.level === 'high',
  );
  const isCriticalType = data.componentType
    ? CRITICAL_COMPONENT_TYPES.has(data.componentType)
    : false;
  return hasSafetyAsset || hasHighRisk || isCriticalType;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function nodeDangerScore(node: DiagramNode): number {
  const data = node.data as NodeData;
  const risks = (data.risks ?? []) as Risk[];
  const threats = (data.threats ?? []) as Threat[];

  // Base from risk matrix
  let riskScore = 0.25; // default: unknown node, moderate baseline
  if (risks.length > 0) {
    const maxRisk = Math.max(...risks.map((r) => r.likelihood * r.impact));
    riskScore = maxRisk / 25;
  }

  // CWE bonus (each CWE adds exploitability evidence)
  const cweCount = threats.filter((t) => !!t.cweId).length;
  const cweBonus = Math.min(cweCount * 0.04, 0.2);

  return Math.min(riskScore + cweBonus, 1.0);
}

function pathScore(hops: AttackPathHop[]): number {
  if (hops.length === 0) return 0;
  const avg = hops.reduce((s, h) => s + h.dangerScore, 0) / hops.length;
  // Longer paths with high scores should rank higher than short paths with same avg
  const lengthBonus = Math.min((hops.length - 1) * 0.02, 0.15);
  return Math.min((avg + lengthBonus) * 100, 100);
}

function scoreToRiskLevel(score: number): AttackPath['riskLevel'] {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

// ─── Graph construction ───────────────────────────────────────────────────────

type AdjEntry = { targetId: string; edgeId: string };

function buildAdjacency(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): Map<string, AdjEntry[]> {
  const validIds = new Set(nodes.filter((n) => n.type !== 'boundary').map((n) => n.id));
  const adj = new Map<string, AdjEntry[]>();
  for (const n of nodes) adj.set(n.id, []);

  for (const e of edges) {
    if (!validIds.has(e.source) || !validIds.has(e.target)) continue;
    // Treat edges as undirected (system diagram, not data-flow)
    adj.get(e.source)!.push({ targetId: e.target, edgeId: e.id });
    adj.get(e.target)!.push({ targetId: e.source, edgeId: e.id });
  }
  return adj;
}

// ─── Path finding (DFS, simple paths, max depth) ─────────────────────────────

const MAX_DEPTH = 8;
const MAX_PATHS_PER_ENTRY = 20;

function findPaths(
  startId: string,
  targetIds: Set<string>,
  adj: Map<string, AdjEntry[]>,
  nodeMap: Map<string, DiagramNode>,
): Array<{ nodeIds: string[]; edgeIds: string[] }> {
  const results: Array<{ nodeIds: string[]; edgeIds: string[] }> = [];
  const visited = new Set<string>([startId]);

  function dfs(
    currentId: string,
    nodeIds: string[],
    edgeIds: string[],
  ) {
    if (results.length >= MAX_PATHS_PER_ENTRY) return;
    if (nodeIds.length > MAX_DEPTH) return;

    if (targetIds.has(currentId) && nodeIds.length > 1) {
      results.push({ nodeIds: [...nodeIds], edgeIds: [...edgeIds] });
      // Don't return - continue exploring beyond target only if still room
      if (nodeIds.length >= MAX_DEPTH) return;
    }

    const neighbors = adj.get(currentId) ?? [];
    for (const { targetId, edgeId } of neighbors) {
      if (visited.has(targetId)) continue;
      // Skip entry-point nodes as intermediate hops (they're only valid as start)
      const neighbor = nodeMap.get(targetId);
      if (!neighbor) continue;
      visited.add(targetId);
      nodeIds.push(targetId);
      edgeIds.push(edgeId);
      dfs(targetId, nodeIds, edgeIds);
      nodeIds.pop();
      edgeIds.pop();
      visited.delete(targetId);
    }
  }

  dfs(startId, [startId], []);
  return results;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeAttackPaths(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): AttackPath[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = buildAdjacency(nodes, edges);

  const entryPoints = nodes.filter((n) => n.type !== 'boundary' && isEntryPoint(n));
  const criticalTargets = new Set(
    nodes.filter((n) => n.type !== 'boundary' && isCriticalTarget(n)).map((n) => n.id),
  );

  // Fall back: if no entry points found, use nodes connected to boundary nodes
  const effectiveEntries =
    entryPoints.length > 0
      ? entryPoints
      : nodes.filter((n) => n.type !== 'boundary').slice(0, 3);

  // Fall back: if no critical targets, use all non-boundary, non-entry nodes
  const effectiveTargets =
    criticalTargets.size > 0
      ? criticalTargets
      : new Set(
          nodes
            .filter((n) => n.type !== 'boundary' && !isEntryPoint(n))
            .map((n) => n.id),
        );

  const allPaths: AttackPath[] = [];

  for (const entry of effectiveEntries) {
    const rawPaths = findPaths(entry.id, effectiveTargets, adj, nodeMap);

    for (const raw of rawPaths) {
      const hops: AttackPathHop[] = raw.nodeIds.map((nid) => {
        const node = nodeMap.get(nid)!;
        const data = node.data as NodeData;
        return {
          nodeId: nid,
          nodeLabel: String(data.label ?? nid),
          nodeType: node.type ?? 'hardware',
          dangerScore: nodeDangerScore(node),
          risks: (data.risks ?? []) as Risk[],
          cweIds: ((data.threats ?? []) as Threat[])
            .filter((t) => !!t.cweId)
            .map((t) => t.cweId!),
        };
      });

      const score = pathScore(hops);
      allPaths.push({
        id: `path-${entry.id}-${raw.nodeIds.at(-1)}-${allPaths.length}`,
        nodeIds: raw.nodeIds,
        edgeIds: raw.edgeIds,
        entryNodeId: entry.id,
        targetNodeId: raw.nodeIds.at(-1)!,
        score,
        riskLevel: scoreToRiskLevel(score),
        hops,
      });
    }
  }

  // Deduplicate by node sequence, keep highest score
  const seen = new Map<string, AttackPath>();
  for (const p of allPaths) {
    const key = p.nodeIds.join('>');
    const existing = seen.get(key);
    if (!existing || p.score > existing.score) seen.set(key, p);
  }

  return [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 15);
}
