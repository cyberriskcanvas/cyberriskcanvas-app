import type { DiagramNode, DiagramEdge, HardwareNodeData, SoftwareNodeData, BoundaryNodeData } from '@/types';

interface MxCell {
  id: string;
  value: string;
  style: string;
  vertex: boolean;
  edge: boolean;
  source?: string;
  target?: string;
  geometry?: { x: number; y: number; width: number; height: number };
  parent: string;
}

function parseMxCells(xmlString: string): MxCell[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const cells = doc.querySelectorAll('mxCell');
  const result: MxCell[] = [];

  cells.forEach((cell) => {
    const geo = cell.querySelector('mxGeometry');
    result.push({
      id: cell.getAttribute('id') ?? '',
      value: cell.getAttribute('value') ?? '',
      style: cell.getAttribute('style') ?? '',
      vertex: cell.getAttribute('vertex') === '1',
      edge: cell.getAttribute('edge') === '1',
      source: cell.getAttribute('source') ?? undefined,
      target: cell.getAttribute('target') ?? undefined,
      parent: cell.getAttribute('parent') ?? '1',
      geometry: geo
        ? {
            x: parseFloat(geo.getAttribute('x') ?? '0'),
            y: parseFloat(geo.getAttribute('y') ?? '0'),
            width: parseFloat(geo.getAttribute('width') ?? '120'),
            height: parseFloat(geo.getAttribute('height') ?? '60'),
          }
        : undefined,
    });
  });

  return result;
}

function guessNodeType(style: string, label: string): 'hardware' | 'software' | 'boundary' {
  const s = style.toLowerCase();
  const l = label.toLowerCase();

  if (
    s.includes('swimlane') ||
    s.includes('group') ||
    s.includes('container') ||
    s.includes('dashed') ||
    l.includes('zone') ||
    l.includes('boundary') ||
    l.includes('segment')
  ) {
    return 'boundary';
  }

  if (
    l.includes('os') ||
    l.includes('firmware') ||
    l.includes('app') ||
    l.includes('software') ||
    l.includes('service') ||
    l.includes('lib') ||
    l.includes('boot')
  ) {
    return 'software';
  }

  return 'hardware';
}

export function importFromDrawio(xmlString: string): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const cells = parseMxCells(xmlString);
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  // Build parent map for boundary containment
  const parentMap = new Map<string, string>(); // cellId -> parentId
  cells.forEach((c) => {
    if (c.parent && c.parent !== '0' && c.parent !== '1') {
      parentMap.set(c.id, c.parent);
    }
  });

  for (const cell of cells) {
    if (cell.id === '0' || cell.id === '1') continue;

    if (cell.edge && cell.source && cell.target) {
      edges.push({
        id: `e-${cell.id}`,
        source: cell.source,
        target: cell.target,
        label: cell.value || undefined,
      });
      continue;
    }

    if (cell.vertex && cell.geometry && cell.value) {
      const type = guessNodeType(cell.style, cell.value);
      const pos = { x: cell.geometry.x, y: cell.geometry.y };
      const parentId = parentMap.get(cell.id);

      if (type === 'boundary') {
        const node: DiagramNode = {
          id: cell.id,
          type: 'boundary',
          position: pos,
          style: { width: cell.geometry.width, height: cell.geometry.height },
          data: {
            label: cell.value,
            boundaryType: 'logical-zone',
          } as BoundaryNodeData,
        };
        nodes.push(node);
      } else if (type === 'hardware') {
        const node: DiagramNode = {
          id: cell.id,
          type: 'hardware',
          position: pos,
          parentId,
          data: {
            label: cell.value,
            componentType: 'custom',
          } as HardwareNodeData,
        };
        nodes.push(node);
      } else {
        const node: DiagramNode = {
          id: cell.id,
          type: 'software',
          position: pos,
          parentId,
          data: {
            label: cell.value,
            componentType: 'custom',
          } as SoftwareNodeData,
        };
        nodes.push(node);
      }
    }
  }

  return { nodes, edges };
}
