'use client';

import { useState, useEffect } from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import type { DiagramEdge } from '@/types';
import { Shield, ShieldOff } from 'lucide-react';

interface ProtocolDef {
  port: number;
  encrypted: boolean;
  label: string;
}

const PROTOCOLS: Record<string, ProtocolDef> = {
  'MQTT':        { port: 1883, encrypted: false, label: 'MQTT (Port 1883)' },
  'MQTT/TLS':    { port: 8883, encrypted: true,  label: 'MQTT/TLS (Port 8883)' },
  'HTTPS':       { port: 443,  encrypted: true,  label: 'HTTPS (Port 443)' },
  'HTTP':        { port: 80,   encrypted: false, label: 'HTTP (Port 80)' },
  'CoAP':        { port: 5683, encrypted: false, label: 'CoAP (Port 5683)' },
  'CoAPS':       { port: 5684, encrypted: true,  label: 'CoAPS (Port 5684)' },
  'AMQP':        { port: 5672, encrypted: false, label: 'AMQP (Port 5672)' },
  'AMQPS':       { port: 5671, encrypted: true,  label: 'AMQPS (Port 5671)' },
  'WebSocket':   { port: 80,   encrypted: false, label: 'WebSocket (Port 80)' },
  'WSS':         { port: 443,  encrypted: true,  label: 'WSS (Port 443)' },
  'gRPC':        { port: 443,  encrypted: true,  label: 'gRPC (Port 443)' },
  'OPC-UA':      { port: 4840, encrypted: false, label: 'OPC-UA (Port 4840)' },
  'OPC-UA/TLS':  { port: 4843, encrypted: true,  label: 'OPC-UA/TLS (Port 4843)' },
  'Modbus/TCP':  { port: 502,  encrypted: false, label: 'Modbus/TCP (Port 502)' },
  'Profinet':    { port: 0,    encrypted: false, label: 'Profinet' },
  'CAN':         { port: 0,    encrypted: false, label: 'CAN Bus' },
  'Bluetooth':   { port: 0,    encrypted: false, label: 'Bluetooth' },
  'BLE':         { port: 0,    encrypted: false, label: 'BLE' },
  'Zigbee':      { port: 0,    encrypted: false, label: 'Zigbee' },
  'Z-Wave':      { port: 0,    encrypted: false, label: 'Z-Wave' },
  'LoRa':        { port: 0,    encrypted: false, label: 'LoRa/LoRaWAN' },
  'custom':      { port: 0,    encrypted: false, label: '' },
};

const inputClass = 'w-full rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none';
const selectClass = 'w-full rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm text-[#1a1917] focus:border-[#1e293b] focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6b6460] mb-1">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  edgeId: string;
  edge: DiagramEdge;
}

export function EdgeOverviewTab({ edgeId, edge }: Props) {
  const { updateEdgeData } = useDiagramStore();

  const [protocol, setProtocol] = useState(String(edge.data?.protocol ?? 'custom'));
  const [port, setPort] = useState(String(edge.data?.port ?? ''));
  const [encrypted, setEncrypted] = useState(Boolean(edge.data?.encrypted ?? false));
  const [description, setDescription] = useState(String(edge.data?.description ?? ''));
  const [customLabel, setCustomLabel] = useState(String(edge.label ?? ''));

  useEffect(() => {
    setProtocol(String(edge.data?.protocol ?? 'custom'));
    setPort(String(edge.data?.port ?? ''));
    setEncrypted(Boolean(edge.data?.encrypted ?? false));
    setDescription(String(edge.data?.description ?? ''));
    setCustomLabel(String(edge.label ?? ''));
  }, [edgeId]);

  const buildLabel = (proto: string, portVal: string, enc: boolean): string => {
    if (proto === 'custom') return customLabel;
    const def = PROTOCOLS[proto];
    if (!def) return proto;
    const portPart = portVal && portVal !== '0' ? ` (Port ${portVal})` : '';
    const encPart = enc ? '/TLS' : '';
    if (proto === 'MQTT' || proto === 'MQTT/TLS') return `MQTT${encPart}${portPart}`;
    if (portVal && portVal !== '0') return `${proto}${portPart}`;
    return def.label || proto;
  };

  const handleProtocolChange = (proto: string) => {
    setProtocol(proto);
    if (proto === 'custom') return;
    const def = PROTOCOLS[proto];
    if (!def) return;
    const newPort = def.port > 0 ? String(def.port) : '';
    const newEnc = def.encrypted;
    setPort(newPort);
    setEncrypted(newEnc);
    const label = buildLabel(proto, newPort, newEnc);
    updateEdgeData(edgeId, { protocol: proto, port: def.port || undefined, encrypted: newEnc, label });
  };

  const handlePortChange = (val: string) => {
    setPort(val);
  };

  const handleEncryptedToggle = () => {
    const next = !encrypted;
    setEncrypted(next);
    const label = buildLabel(protocol, port, next);
    updateEdgeData(edgeId, { encrypted: next, label });
  };

  const save = () => {
    const portNum = port ? parseInt(port, 10) : undefined;
    const label = protocol === 'custom' ? customLabel : buildLabel(protocol, port, encrypted);
    updateEdgeData(edgeId, {
      protocol: protocol === 'custom' ? undefined : protocol,
      port: portNum,
      encrypted,
      description,
      label,
    });
    if (protocol === 'custom') setCustomLabel(label);
  };

  const isCustom = protocol === 'custom';

  return (
    <div className="space-y-4 p-4">
      <Field label="Protokoll">
        <select
          value={protocol}
          onChange={(e) => handleProtocolChange(e.target.value)}
          className={selectClass}
        >
          <option value="custom">- Freitext -</option>
          <optgroup label="IoT / M2M">
            <option value="MQTT">MQTT</option>
            <option value="MQTT/TLS">MQTT/TLS</option>
            <option value="CoAP">CoAP</option>
            <option value="CoAPS">CoAPS</option>
            <option value="AMQP">AMQP</option>
            <option value="AMQPS">AMQPS</option>
            <option value="LoRa">LoRa/LoRaWAN</option>
            <option value="Zigbee">Zigbee</option>
            <option value="Z-Wave">Z-Wave</option>
            <option value="BLE">BLE</option>
            <option value="Bluetooth">Bluetooth</option>
          </optgroup>
          <optgroup label="Web / Cloud">
            <option value="HTTPS">HTTPS</option>
            <option value="HTTP">HTTP</option>
            <option value="WebSocket">WebSocket</option>
            <option value="WSS">WSS</option>
            <option value="gRPC">gRPC</option>
          </optgroup>
          <optgroup label="Industrial / OT">
            <option value="OPC-UA">OPC-UA</option>
            <option value="OPC-UA/TLS">OPC-UA/TLS</option>
            <option value="Modbus/TCP">Modbus/TCP</option>
            <option value="Profinet">Profinet</option>
            <option value="CAN">CAN Bus</option>
          </optgroup>
        </select>
      </Field>

      {!isCustom && (
        <>
          <Field label="Port">
            <input
              type="number"
              value={port}
              onChange={(e) => handlePortChange(e.target.value)}
              onBlur={save}
              placeholder="automatisch"
              className={inputClass}
            />
          </Field>

          <Field label="Verschlüsselung">
            <button
              type="button"
              onClick={handleEncryptedToggle}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors w-full ${
                encrypted
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {encrypted ? <Shield size={14} /> : <ShieldOff size={14} />}
              {encrypted ? 'Verschlüsselt (TLS)' : 'Unverschlüsselt'}
            </button>
          </Field>
        </>
      )}

      <Field label={isCustom ? 'Beschriftung' : 'Beschriftung (Vorschau)'}>
        <input
          value={isCustom ? customLabel : buildLabel(protocol, port, encrypted)}
          onChange={isCustom ? (e) => setCustomLabel(e.target.value) : undefined}
          readOnly={!isCustom}
          placeholder="z.B. MQTT/TLS (Port 8883)"
          className={`${inputClass} ${!isCustom ? 'bg-[#faf9f7] text-[#6b6460]' : ''}`}
        />
      </Field>

      <Field label="Beschreibung">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Zweck dieser Verbindung…"
          rows={3}
          className="w-full rounded-lg border border-[#e5e1d8] bg-white px-3 py-1.5 text-sm text-[#1a1917] placeholder-[#c8c0b0] focus:border-[#1e293b] focus:outline-none resize-none"
        />
      </Field>

      <button
        onClick={save}
        className="w-full rounded-lg bg-[#1e293b] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0f172a] transition-colors"
      >
        Übernehmen
      </button>
    </div>
  );
}
