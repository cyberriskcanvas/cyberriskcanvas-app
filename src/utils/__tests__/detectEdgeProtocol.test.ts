import { describe, it, expect } from 'vitest';
import { detectEdgeProtocol } from '../detectEdgeProtocol';
import type { DiagramNode, NodeData } from '@/types';

function makeNode(label: string, componentType?: string, description?: string): DiagramNode {
  return {
    id: label,
    type: 'hardware',
    position: { x: 0, y: 0 },
    data: { label, componentType, description } as NodeData,
  } as DiagramNode;
}

const empty = makeNode('');

describe('detectEdgeProtocol', () => {
  // ─── MQTT ──────────────────────────────────────────────────────────────────
  it('detects MQTT/TLS for "mqtts"', () => {
    const r = detectEdgeProtocol(makeNode('mqtts broker'), empty)!;
    expect(r.protocol).toBe('MQTT/TLS');
    expect(r.port).toBe(8883);
    expect(r.encrypted).toBe(true);
  });

  it('detects MQTT/TLS for "mqtt/tls"', () => {
    const r = detectEdgeProtocol(makeNode('mqtt/tls endpoint'), empty)!;
    expect(r.protocol).toBe('MQTT/TLS');
  });

  it('detects plain MQTT for "mqtt broker"', () => {
    const r = detectEdgeProtocol(makeNode('MQTT Broker'), empty)!;
    expect(r.protocol).toBe('MQTT');
    expect(r.port).toBe(1883);
    expect(r.encrypted).toBe(false);
  });

  it('detects MQTT for mosquitto', () => {
    const r = detectEdgeProtocol(makeNode('Mosquitto Server'), empty)!;
    expect(r.protocol).toBe('MQTT');
  });

  // ─── CoAP ─────────────────────────────────────────────────────────────────
  it('detects CoAPS (encrypted) before CoAP', () => {
    const r = detectEdgeProtocol(makeNode('coaps endpoint'), empty)!;
    expect(r.protocol).toBe('CoAPS');
    expect(r.port).toBe(5684);
    expect(r.encrypted).toBe(true);
  });

  it('detects CoAP for plain coap', () => {
    const r = detectEdgeProtocol(makeNode('coap sensor'), empty)!;
    expect(r.protocol).toBe('CoAP');
    expect(r.port).toBe(5683);
    expect(r.encrypted).toBe(false);
  });

  // ─── AMQP ─────────────────────────────────────────────────────────────────
  it('detects AMQPS before AMQP', () => {
    const r = detectEdgeProtocol(makeNode('amqps queue'), empty)!;
    expect(r.protocol).toBe('AMQPS');
    expect(r.encrypted).toBe(true);
  });

  it('detects AMQP for RabbitMQ', () => {
    const r = detectEdgeProtocol(makeNode('RabbitMQ'), empty)!;
    expect(r.protocol).toBe('AMQP');
    expect(r.encrypted).toBe(false);
  });

  // ─── gRPC / WebSocket ──────────────────────────────────────────────────────
  it('detects gRPC', () => {
    const r = detectEdgeProtocol(makeNode('gRPC Service'), empty)!;
    expect(r.protocol).toBe('gRPC');
    expect(r.port).toBe(443);
    expect(r.encrypted).toBe(true);
  });

  it('detects WSS before WebSocket', () => {
    const r = detectEdgeProtocol(makeNode('wss connection'), empty)!;
    expect(r.protocol).toBe('WSS');
    expect(r.encrypted).toBe(true);
  });

  it('detects plain WebSocket', () => {
    const r = detectEdgeProtocol(makeNode('WebSocket Server'), empty)!;
    expect(r.protocol).toBe('WebSocket');
    expect(r.port).toBe(80);
    expect(r.encrypted).toBe(false);
  });

  // ─── HTTP / HTTPS ──────────────────────────────────────────────────────────
  it('detects HTTPS for REST API', () => {
    const r = detectEdgeProtocol(makeNode('REST API'), empty)!;
    expect(r.protocol).toBe('HTTPS');
    expect(r.port).toBe(443);
    expect(r.encrypted).toBe(true);
  });

  it('detects HTTPS for backend server', () => {
    const r = detectEdgeProtocol(makeNode('Backend'), empty)!;
    expect(r.protocol).toBe('HTTPS');
  });

  it('detects HTTP (not HTTPS) for plain http label', () => {
    const r = detectEdgeProtocol(makeNode('http endpoint'), empty)!;
    // "http" matches the HTTPS rule first because HTTPS pattern includes /https/i
    // but "http" alone (without 's') should NOT match /https/i
    expect(r.protocol).toBe('HTTP');
    expect(r.port).toBe(80);
    expect(r.encrypted).toBe(false);
  });

  // ─── OPC-UA ────────────────────────────────────────────────────────────────
  it('detects OPC-UA/TLS for "OPC-UA/TLS"', () => {
    const r = detectEdgeProtocol(makeNode('OPC-UA/TLS Server'), empty)!;
    expect(r.protocol).toBe('OPC-UA/TLS');
    expect(r.port).toBe(4843);
    expect(r.encrypted).toBe(true);
  });

  it('detects OPC-UA/TLS for dash-separated "OPC-UA-TLS"', () => {
    const r = detectEdgeProtocol(makeNode('OPC-UA-TLS server'), empty)!;
    expect(r.protocol).toBe('OPC-UA/TLS');
  });

  it('detects OPC-UA/TLS for "opc ua secure"', () => {
    const r = detectEdgeProtocol(makeNode('OPC UA secure endpoint'), empty)!;
    expect(r.protocol).toBe('OPC-UA/TLS');
  });

  it('detects OPC-UA for SCADA', () => {
    const r = detectEdgeProtocol(makeNode('SCADA System'), empty)!;
    expect(r.protocol).toBe('OPC-UA');
    expect(r.port).toBe(4840);
  });

  // ─── Industrial protocols ──────────────────────────────────────────────────
  it('detects Modbus/TCP', () => {
    const r = detectEdgeProtocol(makeNode('Modbus RTU'), empty)!;
    expect(r.protocol).toBe('Modbus/TCP');
    expect(r.port).toBe(502);
    expect(r.encrypted).toBe(false);
  });

  it('detects Profinet', () => {
    const r = detectEdgeProtocol(makeNode('Profinet controller'), empty)!;
    expect(r.protocol).toBe('Profinet');
  });

  it('detects CAN Bus', () => {
    const r = detectEdgeProtocol(makeNode('CAN-Bus'), empty)!;
    expect(r.protocol).toBe('CAN');
  });

  // ─── Wireless ──────────────────────────────────────────────────────────────
  it('detects Zigbee', () => {
    const r = detectEdgeProtocol(makeNode('Zigbee coordinator'), empty)!;
    expect(r.protocol).toBe('Zigbee');
  });

  it('detects Z-Wave', () => {
    const r = detectEdgeProtocol(makeNode('Z-Wave hub'), empty)!;
    expect(r.protocol).toBe('Z-Wave');
  });

  it('detects LoRa', () => {
    const r = detectEdgeProtocol(makeNode('LoRaWAN gateway'), empty)!;
    expect(r.protocol).toBe('LoRa');
  });

  it('detects BLE before Bluetooth', () => {
    const r = detectEdgeProtocol(makeNode('BLE sensor'), empty)!;
    expect(r.protocol).toBe('BLE');
  });

  it('detects plain Bluetooth', () => {
    const r = detectEdgeProtocol(makeNode('Bluetooth audio'), empty)!;
    expect(r.protocol).toBe('Bluetooth');
  });

  // ─── Search text combination ───────────────────────────────────────────────
  it('matches against target node label if source has no hint', () => {
    const r = detectEdgeProtocol(makeNode('ECU'), makeNode('MQTT Broker'))!;
    expect(r.protocol).toBe('MQTT');
  });

  it('matches against description field', () => {
    const node = makeNode('Sensor', undefined, 'communicates via modbus');
    const r = detectEdgeProtocol(node, empty)!;
    expect(r.protocol).toBe('Modbus/TCP');
  });

  it('matches against componentType field', () => {
    const node = makeNode('Unit', 'telematics');
    const r = detectEdgeProtocol(node, empty)!;
    expect(r.protocol).toBe('HTTPS');
  });

  // ─── No match ─────────────────────────────────────────────────────────────
  it('returns null when no pattern matches', () => {
    const r = detectEdgeProtocol(makeNode('ECU'), makeNode('Actuator'));
    expect(r).toBeNull();
  });

  // ─── Case insensitivity ────────────────────────────────────────────────────
  it('is case-insensitive', () => {
    expect(detectEdgeProtocol(makeNode('ZIGBEE'), empty)?.protocol).toBe('Zigbee');
    expect(detectEdgeProtocol(makeNode('zigbee'), empty)?.protocol).toBe('Zigbee');
    expect(detectEdgeProtocol(makeNode('ZigBee'), empty)?.protocol).toBe('Zigbee');
  });

  // ─── Most-specific-first ordering ─────────────────────────────────────────
  it('MQTT/TLS wins over plain MQTT when both keywords present', () => {
    const r = detectEdgeProtocol(makeNode('mqtts secure mqtt broker'), empty)!;
    expect(r.protocol).toBe('MQTT/TLS');
  });

  it('CoAPS wins over CoAP', () => {
    const r = detectEdgeProtocol(makeNode('coaps coap'), empty)!;
    expect(r.protocol).toBe('CoAPS');
  });
});
