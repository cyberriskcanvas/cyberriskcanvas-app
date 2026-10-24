'use client';

import { usePanelsT } from '@/i18n/panels';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Shield,
  Download,
  ChevronDown,
  FileSpreadsheet,
  Code,
  Sparkles,
  Key,
} from 'lucide-react';
import { aggregateDiagram, countDrafts, hasTemplateThreats } from '@/utils/aggregateDiagram';
import type { CraChecklist } from '@/lib/craChecklist';
import { applyDismissals, checkModel } from '@/utils/modelCheck';
import type { AnnexViiRow } from '@/utils/docGenerators';
import { exportPdf, PRO_EDITION } from '@/pro/ui';
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
import { SecurityTxtModal } from '@/components/Compliance/SecurityTxtModal';
import { useProjectStore } from '@/store/projectStore';
import type { DiagramNode, DiagramEdge } from '@/types';

const TABS = ['overview', 'risks', 'compliance', 'sdl_checklist', 'measures'] as const;

type TabId = typeof TABS[number];

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
  iec62443: boolean;
  craChecklist: CraChecklist;
  initialEdges: unknown[];
  modelDismissed: Record<string, string>;
  annexVii: AnnexViiRow[];
  lockState: LockState;
}

export default function DashboardClient({ diagramId, projectId, diagramName, initialNodes, iec62443, craChecklist, initialEdges, modelDismissed, annexVii, lockState }: Props) {
  const { t: pt } = usePanelsT();
  const [nodes] = useState<DiagramNode[]>(initialNodes as DiagramNode[]);
  const [exporting, setExporting] = useState<'pdf' | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [securityTxtOpen, setSecurityTxtOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const { setProject } = useProjectStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get('tab') as TabId | null) ?? 'overview';
  const validTab = TABS.includes(activeTab as TabId) ? activeTab : 'overview';

  const setTab = useCallback((id: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setExportMenuOpen(false);
    exportPdf(diagramName, summary, { iec62443, templateBased: hasTemplateThreats(nodes), unconfirmed: countDrafts(nodes) }, craChecklist, applyDismissals(checkModel({ nodes, edges: initialEdges as DiagramEdge[], decidedRequirements: new Set(Object.keys(craChecklist)) }), modelDismissed), annexVii).finally(() => setExporting(null));
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
                <span className="text-xs text-[#6b6460] hidden sm:inline">- {pt.reports.title}</span>
                {lockState.isLocked && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    v{lockState.lockedLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Export Actions Menu */}
            <div className="relative flex items-center gap-2" ref={exportMenuRef}>
              <button
                onClick={handleExportPdf}
                disabled={exporting !== null}
                className="flex items-center gap-2 rounded-lg bg-[#1e293b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-50"
              >
                {exporting === 'pdf' ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
                Export PDF
              </button>

              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-[#e5e1d8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1a1917] hover:bg-[#faf9f7]"
              >
                <Download size={13} />
                Compliance Exporte
                <ChevronDown size={12} className={exportMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl border border-[#e5e1d8] bg-white p-1.5 shadow-xl z-50 text-xs">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-[#6b6460] border-b border-[#f4f1ec]">
                    BSI &amp; CRA Exportformate
                  </div>

                  {PRO_EDITION && (
                    <>
                      <a
                        href={`/api/projects/${projectId}/sbom/export?format=cyclonedx`}
                        download
                        onClick={() => setExportMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#faf9f7] text-[#1a1917] transition-colors"
                      >
                        <Code size={14} className="text-indigo-600" />
                        <div>
                          <div className="font-semibold">BSI CycloneDX 1.6 SBOM</div>
                          <div className="text-[10px] text-[#6b6460]">{pt.misc.export.bsiTax}</div>
                        </div>
                      </a>

                      <a
                        href={`/api/projects/${projectId}/sbom/export?format=spdx`}
                        download
                        onClick={() => setExportMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#faf9f7] text-[#1a1917] transition-colors"
                      >
                        <Code size={14} className="text-cyan-600" />
                        <div>
                          <div className="font-semibold">BSI SPDX 3.0.1 SBOM</div>
                          <div className="text-[10px] text-[#6b6460]">SPDX 3.0 JSON-LD Standard</div>
                        </div>
                      </a>

                      <a
                        href={`/api/projects/${projectId}/soa?format=csv`}
                        download
                        onClick={() => setExportMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#faf9f7] text-[#1a1917] transition-colors"
                      >
                        <FileSpreadsheet size={14} className="text-green-600" />
                        <div>
                          <div className="font-semibold">CRA Statement of Applicability (SoA)</div>
                          <div className="text-[10px] text-[#6b6460]">{pt.misc.export.csv}</div>
                        </div>
                      </a>

                      <a
                        href={`/api/projects/${projectId}/soa?format=md`}
                        download
                        onClick={() => setExportMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#faf9f7] text-[#1a1917] transition-colors"
                      >
                        <FileText size={14} className="text-amber-600" />
                        <div>
                          <div className="font-semibold">CRA SoA Bericht (Markdown)</div>
                          <div className="text-[10px] text-[#6b6460]">{pt.misc.export.md}</div>
                        </div>
                      </a>

                      <a
                        href={`/api/projects/${projectId}/oscal`}
                        download
                        onClick={() => setExportMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#faf9f7] text-[#1a1917] transition-colors"
                      >
                        <Sparkles size={14} className="text-purple-600" />
                        <div>
                          <div className="font-semibold">NIST OSCAL v1.1.0 JSON</div>
                          <div className="text-[10px] text-[#6b6460]">{pt.misc.export.oscal}</div>
                        </div>
                      </a>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setExportMenuOpen(false);
                      setSecurityTxtOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[#faf9f7] text-[#1a1917] transition-colors border-t border-[#f4f1ec] mt-1"
                  >
                    <Key size={14} className="text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold">security.txt &amp; CVD-Policy</div>
                      <div className="text-[10px] text-[#6b6460]">RFC 9116 / BSI TR-03183-3 Generator</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-1 -mb-px">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  validTab === tab
                    ? 'border-[#1e293b] text-[#1a1917]'
                    : 'border-transparent text-[#6b6460] hover:text-[#1a1917] hover:border-[#c8c0b0]'
                }`}
              >
                {pt.reports.tabs[tab]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <BaselineBanner />

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {validTab === 'overview' && (
          <>
            <p className="text-sm text-[#6b6460]">{pt.reports.intro}</p>
            <NextSteps summary={summary} iec62443={iec62443} />
            <SummaryCards summary={summary} iec62443={iec62443} />
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
            {iec62443 && <ComplianceOverview compliance={summary.compliance} />}
            <CRAReadinessPanel summary={summary} isLocked={lockState.isLocked} />
            {iec62443 && <div className="xl:col-span-2"><MultiStandardMatrix summary={summary} /></div>}
          </div>
        )}

        {validTab === 'sdl_checklist' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5e1d8] bg-white p-5 text-sm text-[#3d3a36]">
            <p>{pt.reports.sdlMoved}</p>
            <Link href="/organisation" className="rounded-lg bg-[#1a1714] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d3a36]">{pt.reports.toOrg}</Link>
          </div>
        )}

        {validTab === 'measures' && (
          <MeasuresProgress measures={summary.measures} />
        )}
      </main>

      <SecurityTxtModal
        isOpen={securityTxtOpen}
        onClose={() => setSecurityTxtOpen(false)}
        projectName={diagramName}
      />
    </div>
  );
}
