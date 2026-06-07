import { memo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { Cpu, Radio, Settings, Router, Shield, Plug, Wifi, HardDrive, Monitor, Database } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { NodeData, HardwareComponentType, Threat } from '@/types';
import { StrideCoverage } from './StrideCoverage';

const ICON_MAP: Record<string, React.ElementType> = {
  ecu: Cpu, sensor: Radio, actuator: Settings, gateway: Router,
  hsm: Shield, obd: Plug, telematics: Wifi, custom: HardDrive,
  plc: Cpu, hmi: Monitor, historian: Database, rtu: Radio,
};

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  ecu:        { bg: 'bg-blue-50',   border: 'border-blue-400',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
  sensor:     { bg: 'bg-cyan-50',   border: 'border-cyan-400',   icon: 'text-cyan-600',   badge: 'bg-cyan-100 text-cyan-700' },
  actuator:   { bg: 'bg-indigo-50', border: 'border-indigo-400', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  gateway:    { bg: 'bg-violet-50', border: 'border-violet-400', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  hsm:        { bg: 'bg-purple-50', border: 'border-purple-400', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  obd:        { bg: 'bg-sky-50',    border: 'border-sky-400',    icon: 'text-sky-600',    badge: 'bg-sky-100 text-sky-700' },
  telematics: { bg: 'bg-teal-50',   border: 'border-teal-400',   icon: 'text-teal-600',   badge: 'bg-teal-100 text-teal-700' },
  plc:        { bg: 'bg-orange-50', border: 'border-orange-400', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  hmi:        { bg: 'bg-amber-50',  border: 'border-amber-400',  icon: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  historian:  { bg: 'bg-lime-50',   border: 'border-lime-400',   icon: 'text-lime-700',   badge: 'bg-lime-100 text-lime-700' },
  rtu:        { bg: 'bg-yellow-50', border: 'border-yellow-400', icon: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  custom:     { bg: 'bg-gray-50',   border: 'border-gray-400',   icon: 'text-gray-600',   badge: 'bg-gray-100 text-gray-700' },
};

const LABEL_MAP: Record<string, string> = {
  ecu: 'ECU', sensor: 'Sensor', actuator: 'Actuator', gateway: 'Gateway',
  hsm: 'HSM', obd: 'OBD', telematics: 'Telematics', custom: 'Hardware',
  plc: 'PLC', hmi: 'HMI', historian: 'Historian', rtu: 'RTU',
};

function HardwareNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const ct: HardwareComponentType = (data.componentType as HardwareComponentType) ?? 'custom';
  const colors = COLOR_MAP[ct] ?? COLOR_MAP.custom;
  const Icon = ICON_MAP[ct] ?? HardDrive;
  const risks = data.risks ?? [];
  const threats = (data.threats ?? []) as Threat[];

  return (
    <>
      <NodeResizer minWidth={140} minHeight={60} isVisible={selected} color="#6366f1" lineStyle={{ borderWidth: 1 }} />
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Right} id="right-source" />

      <div
        className={cn(
          'min-w-[140px] rounded-xl border-2 px-3 py-2.5 transition-all duration-150',
          colors.bg, colors.border,
          selected ? 'node-shadow-selected' : 'node-shadow',
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border', colors.border)}>
            <Icon size={16} className={colors.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800">{String(data.label)}</p>
            <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', colors.badge)}>
              HW · {LABEL_MAP[ct] ?? ct}
            </span>
          </div>
        </div>

        {data.securityLevel && (
          <div className="mt-1.5">
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
              {String(data.securityLevel)}
            </span>
          </div>
        )}

        {risks.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {risks.some((r) => r.level === 'critical') && <span className="h-2 w-2 rounded-full bg-red-500" title="Critical risk" />}
            {risks.some((r) => r.level === 'high') && <span className="h-2 w-2 rounded-full bg-orange-400" title="High risk" />}
          </div>
        )}
        <StrideCoverage threats={threats} />
      </div>
    </>
  );
}

export default memo(HardwareNode);
