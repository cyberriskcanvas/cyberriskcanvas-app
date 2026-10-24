// Architecture check: deterministic, explainable rules over the canvas model (a linter for the
// architecture, no AI). Every finding names the rule, the affected elements, CRA/IEC references
// and a threat that can be adopted into the analysis. Texts live in src/i18n/modelCheck.ts.
import type { DiagramEdge, DiagramNode, NodeData, Threat } from '@/types';
import { computeAttackPaths } from './attackPaths';

export type Severity = 'high' | 'medium' | 'low';
export type RuleId = 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06' | 'M07' | 'M08' | 'M09' | 'M10' | 'M11';

export interface Finding {
  /** Stable across runs: rule + affected elements. Used for dismissals. */
  id: string;
  ruleId: RuleId;
  severity: Severity;
  nodeIds: string[];
  edgeIds: string[];
  /** Values for the localised text, e.g. component labels. */
  params: Record<string, string>;
  craRefs: string[];
  iecRefs: string[];
  /** Threat to adopt into the analysis; absent for pure documentation gaps. */
  suggestedThreat?: Pick<Threat, 'name' | 'stride' | 'cweId' | 'description'>;
}

export interface ModelCheckInput {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  /** Requirement ids decided at product level (CRA checklist); used by M06. */
  decidedRequirements?: ReadonlySet<string>;
}

// ── Geometry: which zone (boundary) a component sits in ───────────────────────

const DEFAULT_W = 160;
const DEFAULT_H = 70;

interface Rect { x: number; y: number; w: number; h: number }

function absolutePosition(node: DiagramNode, byId: Map<string, DiagramNode>): { x: number; y: number } {
  let x = node.position?.x ?? 0;
  let y = node.position?.y ?? 0;
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  for (let i = 0; parent && i < 10; i++) {
    x += parent.position?.x ?? 0;
    y += parent.position?.y ?? 0;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return { x, y };
}

function sizeOf(node: DiagramNode): { w: number; h: number } {
  const style = (node.style ?? {}) as { width?: number; height?: number };
  return {
    w: node.measured?.width ?? node.width ?? style.width ?? DEFAULT_W,
    h: node.measured?.height ?? node.height ?? style.height ?? DEFAULT_H,
  };
}

/** Zone id per component: explicit parent boundary, else the smallest boundary containing its center. */
export function zonesOf(nodes: DiagramNode[]): Map<string, string | null> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const boundaries = nodes.filter((n) => n.type === 'boundary').map((b) => {
    const p = absolutePosition(b, byId);
    const s = sizeOf(b);
    return { id: b.id, rect: { x: p.x, y: p.y, w: s.w, h: s.h } as Rect };
  });
  const zones = new Map<string, string | null>();
  for (const n of nodes) {
    if (n.type === 'boundary') continue;
    if (n.parentId && byId.get(n.parentId)?.type === 'boundary') {
      zones.set(n.id, n.parentId);
      continue;
    }
    const p = absolutePosition(n, byId);
    const s = sizeOf(n);
    const cx = p.x + s.w / 2;
    const cy = p.y + s.h / 2;
    const containing = boundaries
      .filter((b) => cx >= b.rect.x && cx <= b.rect.x + b.rect.w && cy >= b.rect.y && cy <= b.rect.y + b.rect.h)
      .sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h);
    zones.set(n.id, containing[0]?.id ?? null);
  }
  return zones;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CRITICAL_TYPES = new Set(['ecu', 'hsm', 'actuator', 'plc', 'historian', 'rtu']);
// Plain-text protocols and protocols without authentication/encryption by design
const INSECURE_PROTOCOL = /^(mqtt|coap|amqp|http|websocket|opc-ua|modbus\/tcp|profinet|telnet|ftp|snmp|can)$/i;

const data = (n: DiagramNode) => n.data as NodeData;
const label = (n: DiagramNode) => String(data(n).label ?? n.id);
const isComponent = (n: DiagramNode) => n.type !== 'boundary' && n.type !== 'note';
const sorted = (...ids: string[]) => [...ids].sort().join('+');

function finding(f: Omit<Finding, 'id'>): Finding {
  return { ...f, id: `${f.ruleId}:${sorted(...f.nodeIds, ...f.edgeIds)}` };
}

// ── Rules ─────────────────────────────────────────────────────────────────────

export function checkModel({ nodes, edges, decidedRequirements = new Set() }: ModelCheckInput): Finding[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const components = nodes.filter(isComponent);
  const zones = zonesOf(nodes);
  const out: Finding[] = [];

  const crosses = (e: DiagramEdge) => zones.get(e.source) !== zones.get(e.target);

  for (const e of edges) {
    const src = byId.get(e.source);
    const tgt = byId.get(e.target);
    if (!src || !tgt || !isComponent(src) || !isComponent(tgt)) continue;
    const protocol = String(e.data?.protocol ?? '');
    const names = { from: label(src), to: label(tgt), protocol: protocol || '?' };

    // M01: unencrypted flow across a zone boundary
    if (e.data?.encrypted === false && crosses(e)) {
      out.push(finding({
        ruleId: 'M01', severity: 'high', nodeIds: [src.id, tgt.id], edgeIds: [e.id], params: names,
        craRefs: ['ER.6', 'ER.7'], iecRefs: ['CR 4.1', 'SR 4.1'],
        suggestedThreat: { name: `Eavesdropping or tampering on the link ${names.from} → ${names.to}`, stride: 'I', cweId: 'CWE-319', description: `Traffic crosses a trust boundary without encryption (${names.protocol}).` },
      }));
    } else if (INSECURE_PROTOCOL.test(protocol) && e.data?.encrypted !== true) {
      // M02: insecure protocol inside a zone (crossing ones are already M01)
      out.push(finding({
        ruleId: 'M02', severity: 'medium', nodeIds: [src.id, tgt.id], edgeIds: [e.id], params: names,
        craRefs: ['ER.6'], iecRefs: ['CR 4.1'],
        suggestedThreat: { name: `Insecure protocol ${names.protocol} between ${names.from} and ${names.to}`, stride: 'I', cweId: 'CWE-319', description: 'The protocol offers no confidentiality or authentication by itself.' },
      }));
    }

    // M07: conduit between different security levels without a description
    const slA = data(src).securityLevel;
    const slB = data(tgt).securityLevel;
    if (slA && slB && slA !== slB && crosses(e) && !String(e.data?.description ?? '').trim()) {
      out.push(finding({
        ruleId: 'M07', severity: 'medium', nodeIds: [src.id, tgt.id], edgeIds: [e.id], params: { ...names, slFrom: slA, slTo: slB },
        craRefs: ['ER.11a', 'ER.12'], iecRefs: ['IEC 62443-3-2 (conduits)', 'SR 5.2'],
      }));
    }

    // M04: internet-facing component connected directly to a critical component
    for (const [a, b] of [[src, tgt], [tgt, src]] as const) {
      if (data(a).exposure === 'internet' && CRITICAL_TYPES.has(String(data(b).componentType)) && !CRITICAL_TYPES.has(String(data(a).componentType))) {
        out.push(finding({
          ruleId: 'M04', severity: 'high', nodeIds: [a.id, b.id], edgeIds: [e.id], params: { exposed: label(a), critical: label(b) },
          craRefs: ['ER.11a', 'ER.12'], iecRefs: ['SR 5.2', 'SR 5.1'],
          suggestedThreat: { name: `Direct attack path from ${label(a)} to ${label(b)}`, stride: 'E', cweId: 'CWE-284', description: 'An internet-exposed component is connected directly to a critical component without a gateway or DMZ in between.' },
        }));
      }
    }
  }

  for (const n of components) {
    const d = data(n);
    // Third parties and external actors are not part of the product: no findings about their own state
    const own = d.scope !== 'external_3rd_party';

    // M03: internet-facing without (stated) authentication
    if (own && d.exposure === 'internet' && (d.authentication === 'none' || d.authentication === undefined)) {
      out.push(finding({
        ruleId: 'M03', severity: d.authentication === 'none' ? 'high' : 'medium', nodeIds: [n.id], edgeIds: [],
        params: { component: label(n), stated: d.authentication === 'none' ? 'none' : 'unset' },
        craRefs: ['ER.5', 'ER.5a'], iecRefs: ['CR 1.1', 'SR 1.1'],
        suggestedThreat: d.authentication === 'none'
          ? { name: `Unauthenticated access to ${label(n)}`, stride: 'S', cweId: 'CWE-306', description: 'The component is reachable from the internet without authentication.' }
          : undefined,
      }));
    }

    // M05: maintenance/debug interface reachable beyond physical access
    if (d.componentType === 'obd' && (d.exposure === 'internet' || d.exposure === 'local-network')) {
      out.push(finding({
        ruleId: 'M05', severity: 'high', nodeIds: [n.id], edgeIds: [], params: { component: label(n), exposure: d.exposure },
        craRefs: ['ER.11', 'ER.11a'], iecRefs: ['CR 2.1', 'SR 2.1'],
        suggestedThreat: { name: `Remote misuse of the maintenance interface ${label(n)}`, stride: 'E', cweId: 'CWE-1191', description: 'A maintenance or debug interface is reachable without physical access.' },
      }));
    }

    // M06: personal data without a decision on confidentiality (ER.6)
    if (d.personalData) {
      const nodeDecided = (d.cra ?? []).some((m) => m.requirementId === 'ER.6' && (m.status === 'compliant' || m.status === 'not-applicable'));
      if (!nodeDecided && !decidedRequirements.has('ER.6')) {
        out.push(finding({
          ruleId: 'M06', severity: 'medium', nodeIds: [n.id], edgeIds: [], params: { component: label(n) },
          craRefs: ['ER.6', 'ER.8'], iecRefs: ['CR 4.1'],
          suggestedThreat: { name: `Disclosure of personal data stored in ${label(n)}`, stride: 'I', cweId: 'CWE-311', description: 'The component handles personal data and no confidentiality measure is recorded.' },
        }));
      }
    }

    // M08: software component without version
    if (own && n.type === 'software' && !String(d.version ?? '').trim()) {
      out.push(finding({ ruleId: 'M08', severity: 'low', nodeIds: [n.id], edgeIds: [], params: { component: label(n) }, craRefs: ['VH.1', 'VH.1a'], iecRefs: [] }));
    }

    const realThreats = (d.threats ?? []).filter((t) => !t.draft);
    // M09: backend operated for the product (RDPS) without any analysis
    if (!own) {
      // nothing to analyse
    } else if (d.scope === 'rdps_backend' && realThreats.length === 0) {
      out.push(finding({ ruleId: 'M09', severity: 'medium', nodeIds: [n.id], edgeIds: [], params: { component: label(n) }, craRefs: ['ER.0'], iecRefs: [] }));
    } else if (realThreats.length === 0 && (d.threats ?? []).length === 0 && (d.assets ?? []).length === 0) {
      // M10: blind spot (drafts count as "started", the task list handles them)
      out.push(finding({ ruleId: 'M10', severity: 'low', nodeIds: [n.id], edgeIds: [], params: { component: label(n) }, craRefs: ['ER.0'], iecRefs: [] }));
    }
  }

  // M11: dangerous attack path where nothing along it is mitigated
  for (const p of computeAttackPaths(nodes, edges)) {
    if (p.score < 70) continue;
    const mitigated = p.nodeIds.some((id) => ((data(byId.get(id)!).measures ?? []).length > 0));
    if (mitigated) continue;
    out.push(finding({
      ruleId: 'M11', severity: 'high', nodeIds: p.nodeIds, edgeIds: p.edgeIds,
      params: { entry: p.hops[0]?.nodeLabel ?? '', target: p.hops.at(-1)?.nodeLabel ?? '', score: String(Math.round(p.score)) },
      craRefs: ['ER.12', 'ER.11a'], iecRefs: ['SR 5.2'],
      suggestedThreat: { name: `Attack path ${p.hops[0]?.nodeLabel ?? ''} → ${p.hops.at(-1)?.nodeLabel ?? ''}`, stride: 'E', description: 'A high-scoring attack path has no measure on any of its components.' },
    }));
  }

  // De-duplicate by id (the same pair can be found from both directions)
  const seen = new Set<string>();
  return out.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

/** Splits findings into open and dismissed (with the stored reason), open ones sorted by severity. */
export function applyDismissals(findings: Finding[], dismissed: Record<string, string>) {
  const open = findings.filter((f) => !(f.id in dismissed)).sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  const done = findings.filter((f) => f.id in dismissed).map((f) => ({ finding: f, reason: dismissed[f.id] }));
  return { open, dismissed: done };
}
