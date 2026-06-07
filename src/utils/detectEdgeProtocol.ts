import type { DiagramNode } from '@/types';

interface DetectedProtocol {
  protocol: string;
  port: number;
  encrypted: boolean;
  label: string;
}

// keyword → protocol mapping; first match wins, ordered most-specific first
const KEYWORD_RULES: Array<{ pattern: RegExp; result: DetectedProtocol }> = [
  {
    pattern: /mqtt[/\s-]?tls|mqtts/i,
    result: { protocol: 'MQTT/TLS', port: 8883, encrypted: true,  label: 'MQTT/TLS (Port 8883)' },
  },
  {
    pattern: /mqtt|message[\s-]?broker|mosquitto|hivemq|emqx/i,
    result: { protocol: 'MQTT',     port: 1883, encrypted: false, label: 'MQTT (Port 1883)' },
  },
  {
    pattern: /coaps/i,
    result: { protocol: 'CoAPS',    port: 5684, encrypted: true,  label: 'CoAPS (Port 5684)' },
  },
  {
    pattern: /coap/i,
    result: { protocol: 'CoAP',     port: 5683, encrypted: false, label: 'CoAP (Port 5683)' },
  },
  {
    pattern: /amqps/i,
    result: { protocol: 'AMQPS',    port: 5671, encrypted: true,  label: 'AMQPS (Port 5671)' },
  },
  {
    pattern: /amqp|rabbitmq/i,
    result: { protocol: 'AMQP',     port: 5672, encrypted: false, label: 'AMQP (Port 5672)' },
  },
  {
    pattern: /grpc/i,
    result: { protocol: 'gRPC',     port: 443,  encrypted: true,  label: 'gRPC (Port 443)' },
  },
  {
    pattern: /wss|websocket[\s-]?secure/i,
    result: { protocol: 'WSS',      port: 443,  encrypted: true,  label: 'WSS (Port 443)' },
  },
  {
    pattern: /websocket/i,
    result: { protocol: 'WebSocket', port: 80,  encrypted: false, label: 'WebSocket (Port 80)' },
  },
  {
    pattern: /https|rest[\s-]?api|web[\s-]?api|cloud[\s-]?api|backend|web[\s-]?server/i,
    result: { protocol: 'HTTPS',    port: 443,  encrypted: true,  label: 'HTTPS (Port 443)' },
  },
  {
    pattern: /http/i,
    result: { protocol: 'HTTP',     port: 80,   encrypted: false, label: 'HTTP (Port 80)' },
  },
  {
    pattern: /opc[\s\-/]?ua[\s\-/]?tls|opc[\s\-/]?ua[\s\-/]?secure/i,
    result: { protocol: 'OPC-UA/TLS', port: 4843, encrypted: true, label: 'OPC-UA/TLS (Port 4843)' },
  },
  {
    pattern: /opc[\s-]?ua|opc|scada|historian/i,
    result: { protocol: 'OPC-UA',   port: 4840, encrypted: false, label: 'OPC-UA (Port 4840)' },
  },
  {
    pattern: /modbus/i,
    result: { protocol: 'Modbus/TCP', port: 502, encrypted: false, label: 'Modbus/TCP (Port 502)' },
  },
  {
    pattern: /profinet/i,
    result: { protocol: 'Profinet',  port: 0,   encrypted: false, label: 'Profinet' },
  },
  {
    pattern: /can[\s-]?bus|canbus/i,
    result: { protocol: 'CAN',       port: 0,   encrypted: false, label: 'CAN Bus' },
  },
  {
    pattern: /zigbee/i,
    result: { protocol: 'Zigbee',    port: 0,   encrypted: false, label: 'Zigbee' },
  },
  {
    pattern: /z[\s-]?wave/i,
    result: { protocol: 'Z-Wave',    port: 0,   encrypted: false, label: 'Z-Wave' },
  },
  {
    pattern: /lora[\s-]?wan|lora/i,
    result: { protocol: 'LoRa',      port: 0,   encrypted: false, label: 'LoRa/LoRaWAN' },
  },
  {
    pattern: /ble|bluetooth[\s-]?low[\s-]?energy/i,
    result: { protocol: 'BLE',       port: 0,   encrypted: false, label: 'BLE' },
  },
  {
    pattern: /bluetooth/i,
    result: { protocol: 'Bluetooth', port: 0,   encrypted: false, label: 'Bluetooth' },
  },
  // componentType-based fallbacks
  {
    pattern: /telematics/i,
    result: { protocol: 'HTTPS',    port: 443,  encrypted: true,  label: 'HTTPS (Port 443)' },
  },
];

function extractSearchText(node: DiagramNode): string {
  const d = node.data as Record<string, unknown>;
  return [
    String(d.label ?? ''),
    String(d.componentType ?? ''),
    String(d.description ?? ''),
  ].join(' ');
}

export function detectEdgeProtocol(
  source: DiagramNode,
  target: DiagramNode,
): DetectedProtocol | null {
  const combined = `${extractSearchText(source)} ${extractSearchText(target)}`;
  for (const { pattern, result } of KEYWORD_RULES) {
    if (pattern.test(combined)) return result;
  }
  return null;
}
