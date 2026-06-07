// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { importFromDrawio } from '../drawioImport';

// ─── XML helpers ──────────────────────────────────────────────────────────────

function wrap(...cells: string[]): string {
  return `<mxGraphModel><root>${cells.join('')}</root></mxGraphModel>`;
}

const ROOT_CELLS = `
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
`;

function vertex(
  id: string,
  value: string,
  style = '',
  x = 0,
  y = 0,
  w = 120,
  h = 60,
  parent = '1',
): string {
  return `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="${parent}">
    <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
  </mxCell>`;
}

function edge(id: string, value: string, source: string, target: string): string {
  return `<mxCell id="${id}" value="${value}" edge="1" source="${source}" target="${target}" parent="1"/>`;
}

// ─── Empty / minimal input ────────────────────────────────────────────────────

describe('importFromDrawio - empty / minimal input', () => {
  it('returns empty nodes and edges for empty string', () => {
    const result = importFromDrawio('');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('returns empty nodes and edges for a diagram with only root cells', () => {
    const result = importFromDrawio(wrap(ROOT_CELLS));
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('skips cells with id "0" and "1"', () => {
    const xml = wrap(ROOT_CELLS);
    const { nodes, edges } = importFromDrawio(xml);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });
});

// ─── guessNodeType - boundary ─────────────────────────────────────────────────

describe('importFromDrawio - boundary detection', () => {
  it('classifies swimlane style as boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Network', 'swimlane;fillColor=#dae8fc;'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('classifies group style as boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Cluster', 'group;'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('classifies container style as boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Region', 'container;rounded=1;'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('classifies dashed style as boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Area', 'dashed=1;'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('classifies label containing "zone" as boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'DMZ Zone'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('classifies label containing "boundary" as boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Trust Boundary'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('classifies label containing "segment" as boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'OT Segment'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('boundary node carries boundaryType logical-zone', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'DMZ Zone'));
    const { nodes } = importFromDrawio(xml);
    expect((nodes[0].data as { boundaryType: string }).boundaryType).toBe('logical-zone');
  });

  it('boundary node carries width/height in style', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'DMZ Zone', 'swimlane;', 10, 20, 300, 200));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].style).toEqual({ width: 300, height: 200 });
  });
});

// ─── guessNodeType - software ─────────────────────────────────────────────────

describe('importFromDrawio - software detection', () => {
  it.each([
    ['Linux OS', 'os'],
    ['Firmware v2', 'firmware'],
    ['Web App', 'app'],
    ['Update Service', 'service'],
    ['libssl', 'lib'],
    ['Bootloader', 'boot'],
    ['My Software', 'software'],
  ])('classifies "%s" as software', (label) => {
    const xml = wrap(ROOT_CELLS, vertex('n1', label));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('software');
  });

  it('software node has componentType custom', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Web App'));
    const { nodes } = importFromDrawio(xml);
    expect((nodes[0].data as { componentType: string }).componentType).toBe('custom');
  });
});

// ─── guessNodeType - hardware (default) ──────────────────────────────────────

describe('importFromDrawio - hardware detection', () => {
  it('defaults to hardware for a plain label with no matching keywords', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'PLC Unit'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('hardware');
  });

  it('hardware node has componentType custom', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'PLC Unit'));
    const { nodes } = importFromDrawio(xml);
    expect((nodes[0].data as { componentType: string }).componentType).toBe('custom');
  });

  it('style check is case-insensitive - SWIMLANE triggers boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Area', 'SWIMLANE;'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });

  it('label check is case-insensitive - ZONE triggers boundary', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Security ZONE'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].type).toBe('boundary');
  });
});

// ─── Node geometry and id ─────────────────────────────────────────────────────

describe('importFromDrawio - node geometry and id', () => {
  it('preserves node id from mxCell', () => {
    const xml = wrap(ROOT_CELLS, vertex('abc-123', 'Router'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].id).toBe('abc-123');
  });

  it('preserves position from mxGeometry', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'Router', '', 42, 99));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].position).toEqual({ x: 42, y: 99 });
  });

  it('preserves label in node data', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', 'My Device'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].data.label).toBe('My Device');
  });

  it('skips vertex cells without a value (empty label)', () => {
    const xml = wrap(ROOT_CELLS, vertex('n1', ''));
    const { nodes } = importFromDrawio(xml);
    expect(nodes).toHaveLength(0);
  });

  it('skips vertex cells without geometry', () => {
    const xml = wrap(
      ROOT_CELLS,
      `<mxCell id="n1" value="Ghost" vertex="1" parent="1"/>`,
    );
    const { nodes } = importFromDrawio(xml);
    expect(nodes).toHaveLength(0);
  });
});

// ─── Edges ────────────────────────────────────────────────────────────────────

describe('importFromDrawio - edges', () => {
  it('imports an edge with source and target', () => {
    const xml = wrap(ROOT_CELLS, vertex('a', 'PLC'), vertex('b', 'HMI'), edge('e1', '', 'a', 'b'));
    const { edges } = importFromDrawio(xml);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('a');
    expect(edges[0].target).toBe('b');
  });

  it('prefixes edge id with "e-"', () => {
    const xml = wrap(ROOT_CELLS, vertex('a', 'PLC'), vertex('b', 'HMI'), edge('e1', '', 'a', 'b'));
    const { edges } = importFromDrawio(xml);
    expect(edges[0].id).toBe('e-e1');
  });

  it('sets label when edge value is non-empty', () => {
    const xml = wrap(ROOT_CELLS, vertex('a', 'PLC'), vertex('b', 'HMI'), edge('e1', 'Modbus TCP', 'a', 'b'));
    const { edges } = importFromDrawio(xml);
    expect(edges[0].label).toBe('Modbus TCP');
  });

  it('sets label to undefined when edge value is empty', () => {
    const xml = wrap(ROOT_CELLS, vertex('a', 'PLC'), vertex('b', 'HMI'), edge('e1', '', 'a', 'b'));
    const { edges } = importFromDrawio(xml);
    expect(edges[0].label).toBeUndefined();
  });

  it('skips edge cells that lack source or target', () => {
    const xml = wrap(
      ROOT_CELLS,
      `<mxCell id="e1" value="" edge="1" parent="1"/>`,
    );
    const { edges } = importFromDrawio(xml);
    expect(edges).toHaveLength(0);
  });

  it('imports multiple edges', () => {
    const xml = wrap(
      ROOT_CELLS,
      vertex('a', 'PLC'),
      vertex('b', 'HMI'),
      vertex('c', 'SCADA'),
      edge('e1', '', 'a', 'b'),
      edge('e2', '', 'b', 'c'),
    );
    const { edges } = importFromDrawio(xml);
    expect(edges).toHaveLength(2);
  });
});

// ─── Parent / containment ─────────────────────────────────────────────────────

describe('importFromDrawio - parentId containment', () => {
  it('sets parentId for a node nested inside another cell', () => {
    const xml = wrap(
      ROOT_CELLS,
      vertex('zone1', 'DMZ Zone', 'swimlane;', 0, 0, 400, 300),
      vertex('plc1', 'PLC', '', 50, 50, 120, 60, 'zone1'),
    );
    const { nodes } = importFromDrawio(xml);
    const plc = nodes.find((n) => n.id === 'plc1')!;
    expect(plc.parentId).toBe('zone1');
  });

  it('does not set parentId when parent is "1" (top-level)', () => {
    const xml = wrap(ROOT_CELLS, vertex('plc1', 'PLC', '', 0, 0, 120, 60, '1'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].parentId).toBeUndefined();
  });

  it('does not set parentId when parent is "0"', () => {
    const xml = wrap(
      ROOT_CELLS,
      `<mxCell id="plc1" value="PLC" vertex="1" parent="0">
        <mxGeometry x="0" y="0" width="120" height="60" as="geometry"/>
      </mxCell>`,
    );
    const { nodes } = importFromDrawio(xml);
    // parent="0" is skipped by parentMap logic, so parentId should be undefined
    expect(nodes[0]?.parentId).toBeUndefined();
  });

  it('boundary nodes do not carry parentId', () => {
    const xml = wrap(ROOT_CELLS, vertex('zone1', 'DMZ Zone', 'swimlane;'));
    const { nodes } = importFromDrawio(xml);
    expect(nodes[0].parentId).toBeUndefined();
  });
});

// ─── Mixed diagram ────────────────────────────────────────────────────────────

describe('importFromDrawio - mixed realistic diagram', () => {
  it('correctly splits nodes and edges in a PLC→HMI diagram', () => {
    const xml = wrap(
      ROOT_CELLS,
      vertex('plc', 'PLC Controller', '', 0, 0),
      vertex('hmi', 'HMI App', '', 200, 0),
      vertex('fw', 'Firewall', '', 100, 150),
      edge('e1', 'Modbus', 'plc', 'fw'),
      edge('e2', '', 'fw', 'hmi'),
    );
    const { nodes, edges } = importFromDrawio(xml);
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(nodes.find((n) => n.id === 'plc')!.type).toBe('hardware');
    expect(nodes.find((n) => n.id === 'hmi')!.type).toBe('software');
    expect(nodes.find((n) => n.id === 'fw')!.type).toBe('hardware');
  });
});
