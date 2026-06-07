import type { DiagramNode, DiagramEdge } from '@/types';

export type SystemType = 'iot' | 'vehicle' | 'industrial' | 'web';
export type ConnectionType = 'wifi' | 'bluetooth' | 'cellular' | 'lan' | 'mqtt' | 'obd';
export type StorageType = 'cloud' | 'local' | 'device' | 'none';
export type BoundaryType = 'external' | 'maintenance' | 'thirdparty';

export interface WizardAnswers {
  projectName: string;
  projectDescription: string;
  systemType: SystemType;
  connections: ConnectionType[];
  storage: StorageType;
  boundaries: BoundaryType[];
}

interface NodeSpec {
  id: string;
  type: 'hardware' | 'software';
  label: string;
  componentType: string;
  description: string;
  x: number;
  y: number;
}

const SYSTEM_CORES: Record<SystemType, NodeSpec[]> = {
  iot: [
    { id: 'w-device', type: 'hardware', label: 'IoT Device', componentType: 'sensor', description: 'Central IoT device. Captures sensor data and communicates with the environment.', x: 160, y: 200 },
  ],
  vehicle: [
    { id: 'w-gateway', type: 'hardware', label: 'Gateway ECU', componentType: 'gateway', description: 'Central gateway connecting internal vehicle networks with external interfaces.', x: 100, y: 200 },
    { id: 'w-ecu', type: 'hardware', label: 'Control Unit (ECU)', componentType: 'ecu', description: 'Controls vehicle functions and reports diagnostic data.', x: 300, y: 200 },
  ],
  industrial: [
    { id: 'w-plc', type: 'hardware', label: 'PLC', componentType: 'actuator', description: 'Programmable logic controller. Controls actuators and reads sensor data.', x: 100, y: 200 },
    { id: 'w-scada', type: 'software', label: 'SCADA Server', componentType: 'application', description: 'Monitors and controls the industrial system via HMI.', x: 300, y: 200 },
  ],
  web: [
    { id: 'w-frontend', type: 'software', label: 'Web Frontend', componentType: 'application', description: 'Browser-based user interface of the application.', x: 100, y: 200 },
    { id: 'w-api', type: 'software', label: 'API Server', componentType: 'network_service', description: 'Backend service processing business logic and database access.', x: 300, y: 200 },
  ],
};

const CORE_EDGES: Record<SystemType, DiagramEdge[]> = {
  iot: [],
  vehicle: [{ id: 'w-edge-core', source: 'w-gateway', target: 'w-ecu' }],
  industrial: [{ id: 'w-edge-core', source: 'w-plc', target: 'w-scada' }],
  web: [{ id: 'w-edge-core', source: 'w-frontend', target: 'w-api' }],
};

function getCoreAnchor(systemType: SystemType): string {
  const cores = SYSTEM_CORES[systemType];
  return cores[cores.length - 1].id;
}

export function generateDiagram(answers: WizardAnswers): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  // 1. Core nodes
  for (const spec of SYSTEM_CORES[answers.systemType]) {
    nodes.push(makeNode(spec));
  }
  edges.push(...CORE_EDGES[answers.systemType]);

  const coreAnchor = getCoreAnchor(answers.systemType);
  const connectorX = 500;
  let connY = 80;
  const connStep = 130;

  // 2. Connection nodes
  const connSpecs: Record<ConnectionType, { label: string; componentType: string; nodeType: 'hardware' | 'software'; desc: string }> = {
    wifi:      { label: 'Wi-Fi Access Point',  componentType: 'gateway',         nodeType: 'hardware', desc: 'Wireless network (IEEE 802.11). Potential attack surface without WPA3.' },
    bluetooth: { label: 'Bluetooth Module',    componentType: 'sensor',          nodeType: 'hardware', desc: 'Short-range communication. Risk: pairing attacks, MITM.' },
    cellular:  { label: 'Cellular Module',     componentType: 'telematics',      nodeType: 'hardware', desc: 'Cellular connection (4G/5G). Enables remote access and OTA updates.' },
    lan:       { label: 'Network Switch',      componentType: 'gateway',         nodeType: 'hardware', desc: 'Wired Ethernet network. Risk: physical access.' },
    mqtt:      { label: 'MQTT Broker',         componentType: 'network_service', nodeType: 'software', desc: 'Message broker for IoT communication. Verify authentication.' },
    obd:       { label: 'OBD Interface',       componentType: 'obd',             nodeType: 'hardware', desc: 'Diagnostic port (OBD-II). Physical access enables CAN bus access.' },
  };

  const connIds: string[] = [];
  for (const conn of answers.connections) {
    const spec = connSpecs[conn];
    const id = `w-conn-${conn}`;
    connIds.push(id);
    nodes.push(makeNode({ id, type: spec.nodeType, label: spec.label, componentType: spec.componentType, description: spec.desc, x: connectorX, y: connY }));
    edges.push({ id: `w-edge-${conn}`, source: coreAnchor, target: id });
    connY += connStep;
  }

  // 3. Storage node
  const storageX = connectorX + 230;
  const storageY = 200;
  const storageAnchor = connIds.length > 0 ? connIds[Math.floor(connIds.length / 2)] : coreAnchor;

  if (answers.storage === 'cloud') {
    nodes.push(makeNode({ id: 'w-cloud', type: 'software', label: 'Cloud Backend', componentType: 'application', description: 'Cloud-side service: data storage, processing, API endpoints.', x: storageX, y: storageY }));
    nodes.push(makeNode({ id: 'w-cloudserver', type: 'hardware', label: 'Cloud Server', componentType: 'gateway', description: 'Physical or virtual server infrastructure at the cloud provider.', x: storageX, y: storageY + 140 }));
    edges.push({ id: 'w-edge-cloud-1', source: storageAnchor, target: 'w-cloud' });
    edges.push({ id: 'w-edge-cloud-2', source: 'w-cloud', target: 'w-cloudserver' });
  } else if (answers.storage === 'local') {
    nodes.push(makeNode({ id: 'w-localserver', type: 'hardware', label: 'Local Server', componentType: 'gateway', description: 'On-premises server for data storage. Physical security required.', x: storageX, y: storageY }));
    edges.push({ id: 'w-edge-local', source: storageAnchor, target: 'w-localserver' });
  }

  // 4. Trust boundaries / external actors
  if (answers.boundaries.includes('external')) {
    const externalTarget = connIds.length > 0 ? connIds[0] : coreAnchor;
    nodes.push(makeNode({ id: 'w-internet', type: 'hardware', label: 'Internet / External Users', componentType: 'custom', description: 'External users or attackers from the internet.', x: connectorX + 140, y: -80 }));
    edges.push({ id: 'w-edge-ext', source: 'w-internet', target: externalTarget });
  }
  if (answers.boundaries.includes('maintenance')) {
    nodes.push(makeNode({ id: 'w-maint', type: 'hardware', label: 'Maintenance Interface', componentType: 'obd', description: 'Physical or logical maintenance interface. Access by authorized personnel only.', x: 160, y: 380 }));
    edges.push({ id: 'w-edge-maint', source: coreAnchor, target: 'w-maint' });
  }
  if (answers.boundaries.includes('thirdparty')) {
    const tpTarget = answers.storage === 'cloud' ? 'w-cloud' : (connIds.length > 0 ? connIds[connIds.length - 1] : coreAnchor);
    nodes.push(makeNode({ id: 'w-extapi', type: 'software', label: 'External API / Third Party', componentType: 'network_service', description: 'External services or third-party APIs. Verify trustworthiness.', x: storageX + 220, y: storageY }));
    edges.push({ id: 'w-edge-api', source: tpTarget, target: 'w-extapi' });
  }

  // 5. Outer trust boundary wrapping the core
  const allX = nodes.map((n) => (n.position?.x ?? 0));
  const allY = nodes.map((n) => (n.position?.y ?? 0));
  const minX = Math.min(...allX) - 40;
  const minY = Math.min(...allY) - 50;
  const maxX = Math.max(...allX) + 180;
  const maxY = Math.max(...allY) + 120;

  nodes.unshift({
    id: 'w-boundary',
    type: 'boundary',
    position: { x: minX, y: minY },
    style: { width: maxX - minX, height: maxY - minY },
    zIndex: -1,
    data: {
      label: answers.projectName,
      boundaryType: 'trust-zone',
      description: `System boundary: ${answers.projectName}`,
    },
  });

  return { nodes, edges };
}

function makeNode(spec: NodeSpec): DiagramNode {
  return {
    id: spec.id,
    type: spec.type,
    position: { x: spec.x, y: spec.y },
    data: {
      label: spec.label,
      componentType: spec.componentType as DiagramNode['data']['componentType'],
      description: spec.description,
    },
  };
}
