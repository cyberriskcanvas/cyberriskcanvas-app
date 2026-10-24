import type { Asset, DiagramNode, NodeData, Threat } from '@/types';
import type { SystemType } from './generateDiagram';
import { BSI_ASSET_CATALOG } from '@/data/bsiAssets';
import { THREAT_EXAMPLES } from '@/data/threatExamples';

const MAX_THREATS_PER_NODE = 4;
const SECRET_HOLDERS = ['application', 'network_service', 'gateway', 'telematics', 'ecu'];
const LOG_HOLDERS = ['application', 'network_service'];
const STORAGE_NODE_IDS = ['w-cloud', 'w-localserver'];
// External actors (Internet, third parties) are not part of the product and get no assets.
const NO_ASSET_TYPES = ['custom'];

// Template tags that only make sense in one domain. A Wi-Fi access point is a `gateway` too,
// but must not get "CAN bus flooding" unless the product is a vehicle system.
const DOMAIN_TAGS: Partial<Record<SystemType, string[]>> = {
  vehicle: ['ecu', 'telematics', 'obd'],
  industrial: ['plc', 'rtu', 'hmi', 'historian'],
};

function fitsDomain(tags: string[], systemType: SystemType): boolean {
  return Object.entries(DOMAIN_TAGS).every(([domain, domainTags]) => domain === systemType || !tags.some((t) => domainTags!.includes(t)));
}

function assetCodesFor(node: DiagramNode): string[] {
  const type = String(node.data?.componentType ?? '');
  if (NO_ASSET_TYPES.includes(type)) return [];
  const codes = ['Functions.Essential'];
  if (SECRET_HOLDERS.includes(type)) codes.push('Security.Secrets');
  if (LOG_HOLDERS.includes(type)) codes.push('Security.Logs');
  if (STORAGE_NODE_IDS.includes(node.id)) codes.push('PII.Generic');
  return codes;
}

/**
 * Pre-fills the nodes of a wizard diagram with threats (specific to the component type)
 * and BSI standard assets. Everything is marked `draft` and has to be confirmed by a
 * person in the task view; drafts never count as assessed.
 */
export function addGuidedDraft(nodes: DiagramNode[], systemType: SystemType): DiagramNode[] {
  return nodes.map((node) => {
    if (node.type === 'boundary') return node;
    const type = String(node.data?.componentType ?? '');

    const threats: Threat[] = THREAT_EXAMPLES.filter((t) => t.tags.includes(type) && fitsDomain(t.tags, systemType))
      .slice(0, MAX_THREATS_PER_NODE)
      .map(({ tags: _tags, ...t }, i) => ({ ...t, id: `${node.id}-t${i + 1}`, source: 'template', draft: true }));

    const assets: Asset[] = assetCodesFor(node).flatMap((code, i) => {
      const def = BSI_ASSET_CATALOG.find((a) => a.code === code);
      if (!def) return [];
      return [{
        id: `${node.id}-a${i + 1}`,
        name: def.name,
        category: def.category,
        bsiCode: def.code,
        confidentiality: def.defaultC as Asset['confidentiality'],
        integrity: def.defaultI as Asset['integrity'],
        availability: def.defaultA as Asset['availability'],
        description: def.rationale,
        draft: true,
      }];
    });

    const data: NodeData = { ...node.data, threats, assets };
    return { ...node, data };
  });
}

/**
 * Pre-fills the security facts the architecture check needs, from what the wizard already knows:
 * the external actor and whatever it is wired to are internet-exposed, the maintenance interface is
 * physical-only, storage holds personal data. Authentication stays unset on purpose: the check then
 * asks the team to state it instead of assuming.
 */
export function addGuidedFacts(nodes: DiagramNode[], edges: Array<{ source: string; target: string }>): DiagramNode[] {
  const exposed = new Set<string>();
  for (const e of edges) {
    if (e.source === 'w-internet') exposed.add(e.target);
    if (e.target === 'w-internet') exposed.add(e.source);
  }
  return nodes.map((n) => {
    if (n.type === 'boundary') return n;
    const facts: Partial<NodeData> = {};
    // The external actor and third-party services are outside the product: mark them, do not rate them
    if (n.id === 'w-internet' || n.id === 'w-extapi') facts.scope = 'external_3rd_party';
    else if (exposed.has(n.id) && nodes.some((x) => x.id === 'w-internet')) facts.exposure = 'internet';
    if (n.id === 'w-maint') facts.exposure = 'physical';
    if (STORAGE_NODE_IDS.includes(n.id)) facts.personalData = true;
    return Object.keys(facts).length > 0 ? { ...n, data: { ...n.data, ...facts } } : n;
  });
}
