'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, RefreshCw, Shield } from 'lucide-react';
import { aggregateDiagram } from '@/utils/aggregateDiagram';
import { exportPdf } from '@/utils/exportPdf';
import { SummaryCards } from '@/components/Dashboard/SummaryCards';
import { RiskHeatmap } from '@/components/Dashboard/RiskHeatmap';
import { ThreatsBreakdown } from '@/components/Dashboard/ThreatsBreakdown';
import { ComplianceOverview } from '@/components/Dashboard/ComplianceOverview';
import { MeasuresProgress } from '@/components/Dashboard/MeasuresProgress';
import { TraceabilityMatrix } from '@/components/Dashboard/TraceabilityMatrix';
import { NextSteps } from '@/components/Dashboard/NextSteps';
import { CRAReadinessPanel } from '@/components/Dashboard/CRAReadinessPanel';
import { MultiStandardMatrix } from '@/components/Dashboard/MultiStandardMatrix';
import { BaselineBanner } from '@/components/Baseline/BaselineBanner';
import { useProjectStore } from '@/store/projectStore';
import type { DiagramNode } from '@/types';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'risks', label: 'Risks' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'measures', label: 'Measures' },
] as const;

type TabId = typeof TABS[number]['id'];

interface LockState {
  isLocked: boolean;
  lockedLabel: string | null;
  lockedByName: string | null;
  lockedAt: string | null;
  parentId: string | null;
}

interface Props {
  diagramId: string;
  projectId: string;
  diagramName: string;
  initialNodes: unknown[];
  lockState: LockState;
}

export default function DashboardClient({ diagramId, projectId, diagramName, initialNodes, lockState }: Props) {
  const [nodes] = useState<DiagramNode[]>(initialNodes as DiagramNode[]);
  const [exporting, setExporting] = useState<'pdf' | null>(null);
  const { setProject } = useProjectStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('tab') as TabId | null) ?? 'overview';
  const validTab = TABS.some(t => t.id === activeTab) ? activeTab : 'overview';

  const setTab = useCallback((id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    setProject({
      projectId,
      activeVersion: lockState.isLocked
        ? { id: '', number: 0, status: 'frozen', label: lockState.lockedLabel ?? '', frozenAt: lockState.lockedAt, frozenByName: lockState.lockedByName }
        : null,
    });
  }, [lockState.isLocked]);

  const summary = useMemo(() => aggregateDiagram(nodes), [nodes]);

  const handleExportPdf = () => {
    setExporting('pdf');
    exportPdf(diagramName, summary).finally(() => setExporting(null));
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="sticky top-0 z-10 border-b border-[#e5e1d8] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center gap-3">
              <Link href={`/diagram/${diagramId}`} className="flex items-center gap-1.5 text-sm text-[#6b6460] hover:text-[#1a1917] transition-colors">
                <ArrowLeft size={15} />Editor
              </Link>
              <span className="text-[#c8c0b0]">|</span>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#1e293b]" />
                <span className="font-semibold text-[#1a1917] text-sm">{diagramName}</span>
                <span className="text-xs text-[#6b6460] hidden sm:inline">- Risk Assessment Dashboard</span>
                {lockState.isLocked && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    v{lockState.lockedLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportPdf} disabled={exporting !== null}
                className="flex items-center gap-2 rounded-lg bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-50">
                {exporting === 'pdf' ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
                Export PDF
              </button>
            </div>
          </div>

          <div className="flex gap-1 -mb-px">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  validTab === tab.id
                    ? 'border-[#1e293b] text-[#1a1917]'
                    : 'border-transparent text-[#6b6460] hover:text-[#1a1917] hover:border-[#c8c0b0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <BaselineBanner />

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {validTab === 'overview' && (
          <>
            <NextSteps summary={summary} />
            <SummaryCards summary={summary} />
            <RiskHeatmap risks={summary.risks} />
          </>
        )}

        {validTab === 'risks' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="xl:col-span-2"><ThreatsBreakdown threats={summary.threats} /></div>
            <div className="xl:col-span-2"><TraceabilityMatrix rows={summary.traceabilityRows} /></div>
          </div>
        )}

        {validTab === 'compliance' && (
          <div className="grid gap-6 xl:grid-cols-2">
            <ComplianceOverview compliance={summary.compliance} />
            <CRAReadinessPanel summary={summary} isLocked={lockState.isLocked} />
            <div className="xl:col-span-2"><MultiStandardMatrix summary={summary} /></div>
          </div>
        )}

        {validTab === 'measures' && (
          <MeasuresProgress measures={summary.measures} />
        )}
      </main>
    </div>
  );
}
