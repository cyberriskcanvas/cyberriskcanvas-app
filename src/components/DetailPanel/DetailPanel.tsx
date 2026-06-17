import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Info, Database, AlertTriangle, Activity, ShieldCheck, CheckSquare, FlaskConical, FileCheck, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useDiagramStore } from '@/store/diagramStore';
import { useProjectStore } from '@/store/projectStore';
import { useT } from '@/hooks/useT';
import { OverviewTab } from './tabs/OverviewTab';
import { AssetsTab } from './tabs/AssetsTab';
import { ThreatsTab } from './tabs/ThreatsTab';
import { RisksTab } from './tabs/RisksTab';
import { IEC62443Tab } from './tabs/IEC62443Tab';
import { CRATab } from './tabs/CRATab';
import { MeasuresTab } from './tabs/MeasuresTab';
import { SecurityTestsTab } from './tabs/SecurityTestsTab';
import { EdgeOverviewTab } from './tabs/EdgeOverviewTab';
import { cn } from '@/utils/cn';
import type { NodeData, Risk, SecurityTest } from '@/types';
import { PaywallModal } from '@/components/Paywall/PaywallModal';
import { useTourStore } from '@/store/tourStore';

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 380;

export function DetailPanel() {
  const { selectedNodeId, selectedEdgeId, nodes, edges, closeDetailPanel } = useDiagramStore();
  const activeVersion = useProjectStore((s) => s.activeVersion);
  const isLocked = activeVersion?.status === 'frozen';
  const [activeTab, setActiveTab] = useState('overview');
  const { panelTab } = useTourStore();
  const [paywallTab, setPaywallTab] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const updateScrollState = useCallback(() => {
    const el = tabBarRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(updateScrollState);
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
  }, [updateScrollState, selectedNodeId, selectedEdgeId]);

  const scrollTabs = useCallback((dir: 'left' | 'right') => {
    tabBarRef.current?.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (panelTab) setActiveTab(panelTab);
  }, [panelTab]);

  useEffect(() => {
    setActiveTab('overview');
  }, [selectedEdgeId]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: width };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragRef.current.startWidth + delta));
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

  // ── Edge panel ──────────────────────────────────────────────────────────────
  if (selectedEdgeId) {
    const edge = edges.find((e) => e.id === selectedEdgeId);
    if (!edge) return null;
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    const edgeLabel = String(edge.label ?? '');
    return (
      <div className="relative flex h-full shrink-0 flex-col border-l border-[#e5e1d8] bg-white overflow-hidden" style={{ width }}>
        <div onMouseDown={onMouseDown} className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#1e293b]/15 active:bg-[#1e293b]/25 transition-colors z-20" />
        <div className="flex items-center justify-between border-b border-[#e5e1d8] px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-[#6b6460] mb-0.5">
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600">connection</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-[#6b6460] truncate max-w-[80px]">{String(sourceNode?.data?.label ?? edge.source)}</span>
              <ArrowRight size={12} className="text-[#94a3b8] shrink-0" />
              <span className="text-xs text-[#6b6460] truncate max-w-[80px]">{String(targetNode?.data?.label ?? edge.target)}</span>
            </div>
            {edgeLabel && <h2 className="mt-0.5 truncate text-sm font-semibold text-[#1a1917]">{edgeLabel}</h2>}
          </div>
          <button onClick={closeDetailPanel} className="ml-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#c8c0b0] hover:bg-[#f4f1ec] hover:text-[#1a1917]">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <EdgeOverviewTab edgeId={selectedEdgeId} edge={edge} />
        </div>
      </div>
    );
  }

  // ── Node panel ──────────────────────────────────────────────────────────────
  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node || node.type === 'note') return null;

  const data = node.data as NodeData;
  const nodeType = node.type ?? 'hardware';
  const isBoundary = nodeType === 'boundary';

  const risks = (data.risks ?? []) as Risk[];
  const criticalCount = risks.filter((r) => ['critical', 'high'].includes(r.level)).length;
  const securityTests = (data.securityTests ?? []) as SecurityTest[];
  const failedTestCount = securityTests.filter((t) => t.status === 'failed').length;

  const TABS: Tab[] = [
    { id: 'overview', label: t.detailPanel.overview, icon: Info },
    ...(isBoundary ? [] : [
      { id: 'assets', label: t.detailPanel.assets, icon: Database, count: (data.assets as unknown[])?.length },
      { id: 'threats', label: t.detailPanel.threats, icon: AlertTriangle, count: (data.threats as unknown[])?.length },
      { id: 'risks', label: t.detailPanel.risks, icon: Activity, count: criticalCount || undefined },
      { id: 'iec62443', label: 'IEC 62443', icon: ShieldCheck },
      { id: 'cra', label: 'CRA', icon: FileCheck },
      { id: 'measures', label: t.detailPanel.measures, icon: CheckSquare, count: (data.measures as unknown[])?.length },
      { id: 'security-tests', label: t.detailPanel.tests, icon: FlaskConical, count: failedTestCount || undefined },
    ]),
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div className="relative flex h-full shrink-0 flex-col border-l border-[#e5e1d8] bg-white overflow-hidden" style={{ width }}>
      {/* Resize handle on left edge */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#1e293b]/15 active:bg-[#1e293b]/25 transition-colors z-20"
      />
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5e1d8] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
              nodeType === 'hardware' ? 'bg-blue-100 text-blue-700' :
              nodeType === 'software' ? 'bg-green-100 text-green-700' :
              'bg-purple-100 text-purple-700',
            )}>
              {nodeType}
            </span>
            {criticalCount > 0 && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                {criticalCount} {criticalCount > 1 ? t.detailPanel.risks_plural : t.detailPanel.risk}
              </span>
            )}
          </div>
          <h2 className="mt-0.5 truncate text-sm font-semibold text-[#1a1917]">{String(data.label)}</h2>
        </div>
        <button
          onClick={closeDetailPanel}
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-lg text-[#c8c0b0] hover:bg-[#f4f1ec] hover:text-[#1a1917]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="relative w-full shrink-0 border-b border-[#e5e1d8] bg-[#faf9f7]">
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs('left')}
            className="absolute left-0 top-0 z-20 flex h-full w-8 items-center justify-center bg-[#faf9f7] text-[#1a1917] shadow-[2px_0_6px_0_rgba(0,0,0,0.08)] hover:bg-[#f0ede8] transition-colors border-r border-[#e5e1d8]"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs('right')}
            className="absolute right-0 top-0 z-20 flex h-full w-8 items-center justify-center bg-[#faf9f7] text-[#1a1917] shadow-[-2px_0_6px_0_rgba(0,0,0,0.08)] hover:bg-[#f0ede8] transition-colors border-l border-[#e5e1d8]"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        )}
        <div
          ref={tabBarRef}
          className="flex w-full overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                data-tour={
                  tab.id === 'threats' ? 'threats-list' :
                  tab.id === 'iec62443' ? 'iec-dropdown' :
                  tab.id === 'risks' ? 'risk-matrix' :
                  tab.id === 'measures' ? 'measures-tracker' :
                  undefined
                }
                className={cn(
                  'flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors relative',
                  activeTab === tab.id
                    ? 'text-[#1e293b] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1e293b]'
                    : 'text-[#6b6460] hover:text-[#1a1917]',
                )}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                    (tab.id === 'risks' || tab.id === 'security-tests') ? 'bg-red-100 text-red-700' : 'bg-[#f4f1ec] text-[#6b6460]',
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab key={selectedNodeId} nodeId={selectedNodeId} data={data} nodeType={nodeType} />}
        {activeTab === 'assets' && <AssetsTab nodeId={selectedNodeId} data={data} />}
        {activeTab === 'threats' && <ThreatsTab nodeId={selectedNodeId} nodeType={nodeType} data={data} />}
        {activeTab === 'risks' && <RisksTab nodeId={selectedNodeId} data={data} />}
        {activeTab === 'iec62443' && <IEC62443Tab nodeId={selectedNodeId} nodeType={nodeType} data={data} />}
        {activeTab === 'cra' && <CRATab nodeId={selectedNodeId} data={data} />}
        {activeTab === 'measures' && <MeasuresTab nodeId={selectedNodeId} data={data} readOnly={isLocked} />}
        {activeTab === 'security-tests' && <SecurityTestsTab nodeId={selectedNodeId} data={data} />}
      </div>

      {paywallTab && (
        <PaywallModal
          currentTier="free"
          requiredTier="pro"
          onClose={() => setPaywallTab(null)}
        />
      )}
    </div>
  );
}
