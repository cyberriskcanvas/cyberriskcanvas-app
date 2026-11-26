import { describe, expect, it } from 'vitest';
import { mergeImportedDiagram } from '../mergeImportedDiagram';
import type { DiagramEdge, DiagramNode } from '@/types';

const zone = (id: string, x = 0): DiagramNode =>
  ({ id, type: 'boundary', position: { x, y: 0 }, style: { width: 400, height: 300 }, data: { label: id, boundaryType: 'network-segment', securityLevel: 'SL-2' } }) as DiagramNode;
const plc = (id: string, parentId?: string, data: object = {}): DiagramNode =>
  ({ id, type: 'hardware', position: { x: 10, y: 20 }, ...(parentId && { parentId }), data: { label: id, componentType: 'plc', ...data } }) as DiagramNode;
const edge = (id: string, source: string, target: string, data: object = {}): DiagramEdge => ({ id, source, target, data }) as DiagramEdge;

const imported = { nodes: [zone('df-zone-1'), plc('df-PLC_01', 'df-zone-1'), plc('df-PLC_02', 'df-zone-1')], edges: [edge('df-conn-a', 'df-PLC_01', 'df-PLC_02', { protocol: 'Profinet' })] };

describe('mergeImportedDiagram', () => {
  it('first import adds everything', () => {
    const r = mergeImportedDiagram({ nodes: [], edges: [] }, imported);
    expect(r.stats).toEqual({ added: 4, updated: 0, orphans: 0 });
    expect(r.nodes.map((n) => n.id)).toEqual(['df-zone-1', 'df-PLC_01', 'df-PLC_02']);
  });

  it('a re-import keeps threats, measures and position and takes the structure', () => {
    const threats = [{ id: 't', name: 'Manipulation', stride: 'T' }];
    const current = {
      nodes: [zone('df-zone-1'), { ...plc('df-PLC_01', 'df-zone-1', { threats, measures: [{ id: 'm' }], label: 'old' }), position: { x: 99, y: 99 } }, plc('df-PLC_02', 'df-zone-1')],
      edges: [edge('df-conn-a', 'df-PLC_01', 'df-PLC_02', { protocol: 'old', encrypted: true })],
    };
    const next = { ...imported, nodes: imported.nodes.map((n) => (n.id === 'df-PLC_01' ? { ...n, data: { ...n.data, label: 'SPS Linie 1', securityLevel: 'SL-3' as const } } : n)) };
    const r = mergeImportedDiagram(current, next);
    expect(r.stats).toEqual({ added: 0, updated: 4, orphans: 0 });
    const n = r.nodes.find((x) => x.id === 'df-PLC_01')!;
    expect(n.position).toEqual({ x: 99, y: 99 });
    expect(n.data).toMatchObject({ label: 'SPS Linie 1', securityLevel: 'SL-3', threats, measures: [{ id: 'm' }] });
    expect(r.edges[0].data).toEqual({ protocol: 'Profinet', encrypted: true });
  });

  it('a component moved to another zone takes the new parent and position, parents stay first', () => {
    const current = { nodes: [zone('df-zone-1'), { ...plc('df-PLC_01', 'df-zone-1', { threats: [{ id: 't' }] }), position: { x: 99, y: 99 }, extent: 'parent' as const }], edges: [] };
    const next = { nodes: [zone('df-zone-1'), zone('df-zone-2', 500), { ...plc('df-PLC_01', 'df-zone-2'), position: { x: 5, y: 6 } }], edges: [] };
    const r = mergeImportedDiagram(current, next);
    const n = r.nodes.find((x) => x.id === 'df-PLC_01')!;
    expect(n).toMatchObject({ parentId: 'df-zone-2', position: { x: 5, y: 6 } });
    expect(n.extent).toBeUndefined();
    expect(n.data.threats).toEqual([{ id: 't' }]);
    expect(r.nodes.findIndex((x) => x.id === 'df-zone-2')).toBeLessThan(r.nodes.findIndex((x) => x.id === 'df-PLC_01'));
  });

  it('missing imported elements are flagged, never deleted; own elements are left alone', () => {
    const current = { nodes: [...imported.nodes, plc('own-node')], edges: imported.edges };
    const next = { nodes: [zone('df-zone-1'), plc('df-PLC_01', 'df-zone-1')], edges: [] };
    const r = mergeImportedDiagram(current, next);
    expect(r.stats).toEqual({ added: 0, updated: 2, orphans: 2 });
    expect(r.nodes).toHaveLength(4);
    expect(r.nodes.find((x) => x.id === 'df-PLC_02')!.data.importOrphan).toBe(true);
    expect(r.nodes.find((x) => x.id === 'own-node')!.data.importOrphan).toBeUndefined();
    expect(r.edges[0].data?.importOrphan).toBe(true);
    // back in the next import: the flag goes away
    const back = mergeImportedDiagram(r, imported);
    expect(back.nodes.find((x) => x.id === 'df-PLC_02')!.data.importOrphan).toBeUndefined();
    expect(back.stats.orphans).toBe(0);
  });
});
