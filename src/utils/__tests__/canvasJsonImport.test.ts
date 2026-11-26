import { describe, expect, it } from 'vitest';
import { CANVAS_JSON_FORMAT, parseCanvasJson } from '../canvasJsonImport';

const zone = { id: 'z', type: 'boundary', position: { x: 0, y: 0 }, style: { width: 300, height: 200 }, data: { label: 'Zone', boundaryType: 'network-segment' } };
const plc = { id: 'plc', type: 'hardware', parentId: 'z', position: { x: 20, y: 30 }, data: { label: 'PLC', componentType: 'plc' } };
const source = { tool: 'digital-fabric', projectId: 'p1', projectName: 'Linie 1', exportedAt: '2026-10-24T10:00:00.000Z', hash: 'ab12', scope: 'supply' };
const file = (over: object = {}) => JSON.stringify({ format: CANVAS_JSON_FORMAT, version: 1, nodes: [zone, plc], edges: [{ id: 'e', source: 'z', target: 'plc' }], ...over });

describe('parseCanvasJson', () => {
  it('accepts a zone with a child and an edge', () => {
    const r = parseCanvasJson(file());
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.nodes.map((n) => n.id)).toEqual(['z', 'plc']);
  });

  it.each([
    ['not JSON', '{nope', /JSON/],
    ['wrong format', file({ format: 'other' }), /format/],
    ['wrong version', file({ version: 3 }), /version/],
    ['broken source', file({ version: 2, source: { tool: 'digital-fabric', projectName: 1 } }), /source/],
    ['source hash not hex', file({ version: 2, source: { ...source, hash: '<script>' } }), /source/],
    ['unknown scope', file({ version: 2, source: { ...source, scope: 'everything' } }), /source/],
    ['unknown node type', file({ nodes: [{ ...plc, parentId: undefined, type: 'script' }] }), /type/],
    ['non-finite position', file({ nodes: [{ ...plc, parentId: undefined, position: { x: 'a', y: 0 } }] }), /position/],
    ['child before its zone', file({ nodes: [plc, zone] }), /parent/],
    ['parent is not a boundary', file({ nodes: [{ ...plc, id: 'p0', parentId: undefined }, { ...plc, parentId: 'p0' }] }), /parent/],
    ['duplicate node id', file({ nodes: [zone, zone] }), /duplicate/],
    ['edge to unknown node', file({ edges: [{ id: 'e', source: 'z', target: 'ghost' }] }), /unknown source or target/],
    ['label missing', file({ nodes: [{ ...zone, data: {} }] }), /label/],
  ])('rejects %s', (_name, text, re) => {
    const r = parseCanvasJson(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(re);
  });

  it('accepts version 2 and returns its source', () => {
    const r = parseCanvasJson(file({ version: 2, source }));
    expect(r).toMatchObject({ ok: true, source });
    expect(parseCanvasJson(file({ version: 2 }))).toMatchObject({ ok: true, source: null });
  });

  it('keeps only structural fields, never an analysis from the file', () => {
    const rich = { ...plc, extra: 1, style: { width: 10, height: 10, background: 'url(x)' }, data: { label: 'PLC', componentType: 'plc', securityLevel: 'SL-3', exposure: 'internet', threats: [{ id: 't' }], measures: [{}], securityLevel2: 'x' } };
    const bad = { ...plc, id: 'p2', data: { label: 'X', componentType: 'rocket', securityLevel: 'SL-9', description: 5 } };
    const r = parseCanvasJson(file({ nodes: [zone, rich, bad], edges: [{ id: 'e', source: 'z', target: 'plc', label: 'OPC UA', data: { protocol: 'OPC UA', port: 4840, encrypted: true, onClick: 'x' } }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes[1]).toEqual({ id: 'plc', type: 'hardware', parentId: 'z', position: { x: 20, y: 30 }, style: { width: 10, height: 10 }, data: { label: 'PLC', componentType: 'plc', securityLevel: 'SL-3', exposure: 'internet' } });
    expect(r.nodes[2].data).toEqual({ label: 'X' });
    expect(r.edges[0]).toEqual({ id: 'e', source: 'z', target: 'plc', label: 'OPC UA', data: { protocol: 'OPC UA', port: 4840, encrypted: true } });
  });

  it('rejects oversized files', () => {
    expect(parseCanvasJson(' '.repeat(5_000_001))).toMatchObject({ ok: false });
  });
});
