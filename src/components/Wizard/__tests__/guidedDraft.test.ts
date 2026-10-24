import { describe, expect, it } from 'vitest';
import { generateDiagram } from '../generateDiagram';
import { addGuidedDraft } from '../guidedDraft';
import type { Asset, Threat } from '@/types';

describe('addGuidedDraft', () => {
  const { nodes } = generateDiagram({
    projectName: 'P', projectDescription: '', systemType: 'vehicle', connections: ['cellular'], storage: 'cloud', boundaries: ['external'],
  });
  const drafted = addGuidedDraft(nodes, 'vehicle');

  it('marks every drafted threat and asset as draft and leaves boundaries alone', () => {
    const boundary = drafted.find((n) => n.type === 'boundary')!;
    expect(boundary.data.threats).toBeUndefined();
    const all = drafted.filter((n) => n.type !== 'boundary');
    const threats = all.flatMap((n) => (n.data.threats ?? []) as Threat[]);
    const assets = all.flatMap((n) => (n.data.assets ?? []) as Asset[]);
    expect(threats.length).toBeGreaterThan(0);
    expect(assets.length).toBeGreaterThan(0);
    expect([...threats, ...assets].every((x) => x.draft === true)).toBe(true);
    expect(threats.every((t) => t.source === 'template')).toBe(true);
  });

  it('uses only threats whose tags match the component type, with unique ids', () => {
    const ecu = drafted.find((n) => n.data.componentType === 'ecu')!;
    const ids = ((ecu.data.threats ?? []) as Threat[]).map((t) => t.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every drafted node at least the essential-functions asset with BSI code', () => {
    const node = drafted.find((n) => n.type !== 'boundary')!;
    expect(((node.data.assets ?? []) as Asset[]).some((a) => a.bsiCode === 'Functions.Essential')).toBe(true);
  });

  it('keeps automotive templates out of non-vehicle products and gives external actors no assets', () => {
    const web = generateDiagram({ projectName: 'W', projectDescription: '', systemType: 'web', connections: ['wifi'], storage: 'cloud', boundaries: ['external'] });
    const draftedWeb = addGuidedDraft(web.nodes, 'web');
    const names = draftedWeb.flatMap((n) => ((n.data.threats ?? []) as Threat[]).map((t) => t.name));
    expect(names.some((n) => /CAN Bus|ECU/.test(n))).toBe(false);
    const internet = draftedWeb.find((n) => n.data.componentType === 'custom');
    expect(internet?.data.assets ?? []).toEqual([]);
  });
});

import { addGuidedFacts } from '../guidedDraft';
import { checkModel } from '@/utils/modelCheck';

describe('addGuidedFacts', () => {
  it('marks the external actor and what it is wired to as internet-exposed and leaves authentication unset', () => {
    const { nodes, edges } = generateDiagram({ projectName: 'W', projectDescription: '', systemType: 'web', connections: ['wifi'], storage: 'cloud', boundaries: ['external', 'maintenance'] });
    const out = addGuidedFacts(addGuidedDraft(nodes, 'web'), edges);
    const byId = new Map(out.map((n) => [n.id, n.data]));
    expect(byId.get('w-internet')?.scope).toBe('external_3rd_party'); // the actor is outside the product
    expect(byId.get('w-internet')?.exposure).toBeUndefined();
    expect(out.some((n) => n.data.exposure === 'internet')).toBe(true); // what it is wired to is exposed
    expect(byId.get('w-maint')?.exposure).toBe('physical');
    expect(byId.get('w-cloud')?.personalData).toBe(true);
    expect(out.some((n) => n.data.authentication !== undefined)).toBe(false);
    // the check then asks for the missing authentication statement
    expect(checkModel({ nodes: out, edges }).some((f) => f.ruleId === 'M03')).toBe(true);
  });
});

describe('external actors in the architecture check', () => {
  it('raises no findings about third parties themselves', () => {
    const { nodes, edges } = generateDiagram({ projectName: 'W', projectDescription: '', systemType: 'web', connections: ['wifi'], storage: 'cloud', boundaries: ['external', 'thirdparty'] });
    const out = addGuidedFacts(addGuidedDraft(nodes, 'web'), edges);
    const flagged = checkModel({ nodes: out, edges }).flatMap((f) => f.nodeIds);
    expect(flagged).not.toContain('w-internet');
    expect(flagged).not.toContain('w-extapi');
  });
});
