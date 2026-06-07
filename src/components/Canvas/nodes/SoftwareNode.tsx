import { memo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { Layers, Cpu, AppWindow, Library, Cloud, Terminal, Code2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { NodeData, SoftwareComponentType, Threat } from '@/types';
import { StrideCoverage } from './StrideCoverage';

const ICON_MAP: Record<string, React.ElementType> = {
  os: Layers, firmware: Cpu, application: AppWindow,
  library: Library, network_service: Cloud, bootloader: Terminal, custom: Code2,
};

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  os:              { bg: 'bg-emerald-50', border: 'border-emerald-400', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  firmware:        { bg: 'bg-green-50',   border: 'border-green-400',   icon: 'text-green-600',   badge: 'bg-green-100 text-green-700' },
  application:     { bg: 'bg-lime-50',    border: 'border-lime-500',    icon: 'text-lime-600',    badge: 'bg-lime-100 text-lime-700' },
  library:         { bg: 'bg-yellow-50',  border: 'border-yellow-400',  icon: 'text-yellow-600',  badge: 'bg-yellow-100 text-yellow-700' },
  network_service: { bg: 'bg-orange-50',  border: 'border-orange-400',  icon: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
  bootloader:      { bg: 'bg-amber-50',   border: 'border-amber-400',   icon: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  custom:          { bg: 'bg-gray-50',    border: 'border-gray-400',    icon: 'text-gray-600',    badge: 'bg-gray-100 text-gray-700' },
};

const LABEL_MAP: Record<string, string> = {
  os: 'OS', firmware: 'Firmware', application: 'App', library: 'Library',
  network_service: 'Net Service', bootloader: 'Bootloader', custom: 'Software',
};

function SoftwareNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const ct: SoftwareComponentType = (data.componentType as SoftwareComponentType) ?? 'custom';
  const colors = COLOR_MAP[ct] ?? COLOR_MAP.custom;
  const Icon = ICON_MAP[ct] ?? Code2;
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
            <div className="flex items-center gap-1">
              <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', colors.badge)}>
                SW · {LABEL_MAP[ct] ?? ct}
              </span>
              {data.version && (
                <span className="text-[10px] text-gray-400 font-mono">v{String(data.version)}</span>
              )}
            </div>
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

export default memo(SoftwareNode);
