import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Cpu, Radio, Settings, Router, Shield, Plug, Wifi, HardDrive,
  Layers, AppWindow, Library, Cloud, Code2, ChevronDown, ChevronRight,
  Square, Server, Database, Zap, Globe, Box, Archive, ShieldAlert,
  KeyRound, Activity, Package, Network, Lock, Webhook, StickyNote,
  PanelLeftClose, PanelLeftOpen, Monitor, Factory,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DragData, HardwareComponentType, SoftwareComponentType, BoundaryType } from '@/types';
import { useT } from '@/hooks/useT';
import { useProjectStore, selectIsLocked } from '@/store/projectStore';

interface ComponentDef {
  componentType: HardwareComponentType | SoftwareComponentType | BoundaryType;
  label: string;
  icon: React.ElementType;
  color: string;
}

// ─── Existing component groups ────────────────────────────────────────────────

const HARDWARE_COMPONENTS: ComponentDef[] = [
  { componentType: 'ecu',        label: 'ECU',            icon: Cpu,      color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { componentType: 'sensor',     label: 'Sensor',         icon: Radio,    color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { componentType: 'actuator',   label: 'Actuator',       icon: Settings, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { componentType: 'gateway',    label: 'Gateway',        icon: Router,   color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { componentType: 'hsm',        label: 'HSM',            icon: Shield,   color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { componentType: 'obd',        label: 'OBD Interface',  icon: Plug,     color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { componentType: 'telematics', label: 'Telematics',     icon: Wifi,     color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { componentType: 'custom',     label: 'Custom HW',      icon: HardDrive,color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

const SOFTWARE_COMPONENTS: ComponentDef[] = [
  { componentType: 'os',              label: 'Operating System', icon: Layers,    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { componentType: 'firmware',        label: 'Firmware',         icon: Cpu,       color: 'text-green-600 bg-green-50 border-green-200' },
  { componentType: 'application',     label: 'Application',      icon: AppWindow, color: 'text-lime-600 bg-lime-50 border-lime-200' },
  { componentType: 'library',         label: 'Library / SDK',    icon: Library,   color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { componentType: 'network_service', label: 'Network Service',  icon: Cloud,     color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { componentType: 'bootloader',      label: 'Bootloader',       icon: Code2,     color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { componentType: 'custom',          label: 'Custom SW',        icon: Code2,     color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

const BOUNDARY_COMPONENTS: ComponentDef[] = [
  { componentType: 'trust-zone',      label: 'Trust Zone',       icon: Square, color: 'text-red-600 bg-red-50 border-red-300' },
  { componentType: 'network-segment', label: 'Network Segment',  icon: Square, color: 'text-blue-600 bg-blue-50 border-blue-300' },
  { componentType: 'physical-zone',   label: 'Physical Zone',    icon: Square, color: 'text-green-600 bg-green-50 border-green-300' },
  { componentType: 'logical-zone',    label: 'Logical Zone',     icon: Square, color: 'text-purple-600 bg-purple-50 border-purple-300' },
  { componentType: 'cloud-zone',      label: 'Cloud Zone',       icon: Cloud,  color: 'text-sky-600 bg-sky-50 border-sky-300' },
];

// ─── OT/Industrial component group ───────────────────────────────────────────

const OT_COMPONENTS: ComponentDef[] = [
  { componentType: 'plc',       label: 'PLC',            icon: Cpu,      color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { componentType: 'hmi',       label: 'HMI',            icon: Monitor,  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { componentType: 'historian', label: 'Historian',      icon: Database, color: 'text-lime-700 bg-lime-50 border-lime-200' },
  { componentType: 'rtu',       label: 'RTU',            icon: Radio,    color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { componentType: 'sensor',    label: 'Field Sensor',   icon: Radio,    color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { componentType: 'actuator',  label: 'Field Actuator', icon: Settings, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { componentType: 'gateway',   label: 'OT Gateway',     icon: Router,   color: 'text-violet-600 bg-violet-50 border-violet-200' },
];

// ─── Cloud component groups ───────────────────────────────────────────────────
// These map to existing nodeType/componentType pairs so they render correctly.
// "Cloud Infra" uses hardware nodes; "Cloud Services" uses software nodes.

const CLOUD_INFRA_COMPONENTS: ComponentDef[] = [
  { componentType: 'gateway', label: 'Load Balancer',   icon: Server,  color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { componentType: 'gateway', label: 'API Gateway',     icon: Webhook, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { componentType: 'custom',  label: 'Container / Pod', icon: Box,     color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { componentType: 'custom',  label: 'VM / Instance',   icon: Server,  color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
];

const CLOUD_SERVICE_COMPONENTS: ComponentDef[] = [
  { componentType: 'network_service', label: 'SQL Database',       icon: Database,   color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  { componentType: 'network_service', label: 'NoSQL Database',     icon: Database,   color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { componentType: 'network_service', label: 'Cache (Redis)',       icon: Zap,        color: 'text-red-600 bg-red-50 border-red-200' },
  { componentType: 'network_service', label: 'Message Broker',     icon: Zap,        color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { componentType: 'network_service', label: 'Object Storage (S3)', icon: Archive,   color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { componentType: 'network_service', label: 'CDN',                icon: Globe,      color: 'text-lime-600 bg-lime-50 border-lime-200' },
  { componentType: 'network_service', label: 'WAF',                icon: ShieldAlert,color: 'text-green-600 bg-green-50 border-green-200' },
  { componentType: 'network_service', label: 'Service Mesh',       icon: Network,    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { componentType: 'network_service', label: 'Container Registry', icon: Package,    color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { componentType: 'application',     label: 'Microservice',       icon: AppWindow,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { componentType: 'application',     label: 'Auth Service / IdP', icon: KeyRound,   color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { componentType: 'application',     label: 'Secrets Manager',    icon: Lock,       color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { componentType: 'application',     label: 'Monitoring / SIEM',  icon: Activity,   color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
];

// ─── Section component ────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  items: ComponentDef[];
  nodeType: 'hardware' | 'software' | 'boundary';
  defaultOpen?: boolean;
  indent?: boolean;
}

function Section({ title, items, nodeType, defaultOpen = true, indent = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const onDragStart = (e: React.DragEvent, item: ComponentDef) => {
    const data: DragData = { nodeType, componentType: item.componentType, label: item.label };
    e.dataTransfer.setData('application/cyberrisk', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wider text-[#6b6460] hover:text-[#1a1917]',
          indent ? 'px-5' : 'px-3',
        )}
      >
        {title}
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {open && (
        <div className={cn('space-y-1 pb-2', indent ? 'px-4' : 'px-2')}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={`${nodeType}-${item.componentType}-${item.label}`}
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                className="flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[#1a1917] hover:bg-[#f4f1ec] hover:border-[#e5e1d8] active:cursor-grabbing select-none transition-colors"
              >
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md border', item.color)}>
                  <Icon size={14} />
                </span>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Note section ────────────────────────────────────────────────────────────

function NoteSection() {
  const t = useT();

  const onDragStart = (e: React.DragEvent) => {
    const data: DragData = { nodeType: 'note', componentType: 'note', label: '' };
    e.dataTransfer.setData('application/cyberrisk', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="border-t border-[#e5e1d8]">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#6b6460]">
        {t.sidebar.notes}
      </p>
      <div className="px-2 pb-2">
        <div
          draggable
          onDragStart={onDragStart}
          className="flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[#1a1917] hover:bg-[#f4f1ec] hover:border-[#e5e1d8] active:cursor-grabbing select-none transition-colors"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-yellow-600 bg-yellow-50 border-yellow-200">
            <StickyNote size={14} />
          </span>
          <span className="text-xs font-medium">{t.sidebar.note}</span>
        </div>
      </div>
    </div>
  );
}

// ─── OT group wrapper ─────────────────────────────────────────────────────────

function OTGroup() {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-[#e5e1d8]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-[#f4f1ec] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Factory size={13} className="text-orange-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">OT / Industrial</span>
        </div>
        {open ? <ChevronDown size={14} className="text-orange-500" /> : <ChevronRight size={14} className="text-orange-500" />}
      </button>

      {open && (
        <div className="border-l-2 border-orange-200 ml-3">
          <Section title="Components" items={OT_COMPONENTS} nodeType="hardware" defaultOpen={true} indent />
        </div>
      )}
    </div>
  );
}

// ─── Cloud group wrapper ──────────────────────────────────────────────────────

function CloudGroup() {
  const [open, setOpen] = useState(true);
  const t = useT();

  return (
    <div className="border-t border-[#e5e1d8]">
      {/* Group header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-[#f4f1ec] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cloud size={13} className="text-cyan-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">Cloud</span>
        </div>
        {open ? <ChevronDown size={14} className="text-cyan-500" /> : <ChevronRight size={14} className="text-cyan-500" />}
      </button>

      {open && (
        <div className="border-l-2 border-cyan-200 ml-3">
          <Section title={t.sidebar.infra} items={CLOUD_INFRA_COMPONENTS} nodeType="hardware" defaultOpen={true} indent />
          <Section title={t.sidebar.services} items={CLOUD_SERVICE_COMPONENTS} nodeType="software" defaultOpen={true} indent />
        </div>
      )}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 224; // w-56 = 14rem = 224px

export function ComponentSidebar() {
  const t = useT();
  const isLocked = useProjectStore(selectIsLocked);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const updateShadows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowTopShadow(el.scrollTop > 8);
    setShowBottomShadow(el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  };

  useEffect(() => {
    updateShadows();
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: width };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragRef.current.startWidth + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [width]);

  if (collapsed) {
    return (
      <aside className="relative flex h-full shrink-0 flex-col border-r border-[#e5e1d8] bg-white overflow-hidden" style={{ width: 40 }}>
        <button
          onClick={() => setCollapsed(false)}
          title="Sidebar öffnen"
          className="flex h-10 w-full items-center justify-center text-[#6b6460] hover:text-[#1a1917] hover:bg-[#f4f1ec] transition-colors"
        >
          <PanelLeftOpen size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="relative flex h-full shrink-0 flex-col border-r border-[#e5e1d8] bg-white overflow-hidden" style={{ width }}>
      {/* Resize handle on right edge */}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#1e293b]/15 active:bg-[#1e293b]/25 transition-colors z-20"
      />
      <div className="border-b border-[#e5e1d8] px-3 py-3 shrink-0 flex items-start justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#6b6460]">{t.sidebar.title}</h2>
          <p className="mt-0.5 text-[11px] text-[#c8c0b0]">
            {isLocked ? t.sidebar.lockedHint : t.sidebar.subtitle}
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title="Sidebar einklappen"
          className="mt-0.5 shrink-0 text-[#b0a89a] hover:text-[#1a1917] transition-colors"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {isLocked && (
        <div className="absolute inset-0 z-30 bg-white/70 cursor-not-allowed" />
      )}

      {/* Top scroll shadow */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 h-6 transition-opacity duration-150"
        style={{
          top: 53,
          opacity: showTopShadow ? 1 : 0,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), transparent)',
        }}
      />

      <div
        ref={scrollRef}
        onScroll={updateShadows}
        className="flex-1 overflow-y-auto py-1 space-y-1 scrollbar-thin"
      >
        <Section title={t.sidebar.hardware} items={HARDWARE_COMPONENTS} nodeType="hardware" defaultOpen={true} />
        <Section title={t.sidebar.software} items={SOFTWARE_COMPONENTS} nodeType="software" defaultOpen={true} />
        <Section title={t.sidebar.boundaries} items={BOUNDARY_COMPONENTS} nodeType="boundary" defaultOpen={true} />
        <NoteSection />
        <OTGroup />
        <CloudGroup />
      </div>

      {/* Bottom scroll shadow */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 transition-opacity duration-150"
        style={{
          opacity: showBottomShadow ? 1 : 0,
          background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)',
        }}
      />
    </aside>
  );
}
