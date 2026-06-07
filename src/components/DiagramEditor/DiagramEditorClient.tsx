'use client';

import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '@/components/Canvas/DiagramCanvas';
import { ComponentSidebar } from '@/components/Sidebar/ComponentSidebar';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { ZoomChip } from '@/components/Toolbar/ZoomChip';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { TemplateModal } from '@/components/Templates/TemplateModal';
import { AIAnalysisModal } from '@/components/AI/AIAnalysisModal';
import { VersionPanel } from '@/components/Versioning/VersionPanel';
import { AttackPathPanel } from '@/components/AttackPaths/AttackPathPanel';
import { DocumentsPanel } from '@/components/Documents/DocumentsPanel';
import { ProjectNotesPanel } from '@/components/Canvas/ProjectNotesPanel';
import { OperationsView } from '@/components/Operations/OperationsView';
import { CsafWizardView } from '@/components/Csaf/CsafWizardView';
import { useTierGuard } from '@/hooks/useTierGuard';
import { PaywallModal } from '@/components/Paywall/PaywallModal';
import { BaselineBanner } from '@/components/Baseline/BaselineBanner';
import { FreezeModal } from '@/components/Baseline/FreezeModal';
import { useDiagramStore } from '@/store/diagramStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useProjectStore } from '@/store/projectStore';
import type { DiagramNode, DiagramEdge } from '@/types';
import type { AttackPath } from '@/utils/attackPaths';
import { Lock, PenLine, ShieldAlert, FileCheck2 } from 'lucide-react';

import { useT } from '@/hooks/useT';
import { OnboardingTour } from '@/components/Onboarding/OnboardingTour';

interface VersionState {
  id: string;
  number: number;
  status: 'active' | 'frozen';
  label: string;
  frozenAt: string | null;
  frozenByName: string | null;
}

interface Props {
  diagram: {
    id: string;
    name: string;
    projectId: string;
    nodes: unknown[];
    edges: unknown[];
    viewport: { x: number; y: number; zoom: number };
    initialNotes: string;
    notesUpdatedByName: string | null;
    notesUpdatedAt: string | null;
  };
  user: {
    id: string;
    name: string;
    color: string;
    tier: string;
    companyLogo?: string;
    companyName?: string;
  };
  activeVersion: VersionState | null;
}

type ProjectTab = 'design' | 'operations' | 'csaf';

export default function DiagramEditorClient({ diagram, user, activeVersion }: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<ProjectTab>('design');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showAttackPaths, setShowAttackPaths] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<AttackPath | null>(null);
  // Track current versionId for operations/CSAF tabs - updates after a successful freeze
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(activeVersion?.id ?? null);

  const { setNodes, setEdges, setViewport, setDiagramId } = useDiagramStore();
  const { setTier } = useSubscriptionStore();
  const { setProject, setVersionFrozen } = useProjectStore();

  useEffect(() => {
    setDiagramId(diagram.id);
    setNodes((diagram.nodes as DiagramNode[]) ?? []);
    setEdges((diagram.edges as DiagramEdge[]) ?? []);
    setViewport(diagram.viewport);
  }, [diagram.id]);

  useEffect(() => {
    setTier((user.tier as 'free' | 'pro') ?? 'free');
  }, [user.tier]);

  useEffect(() => {
    setProject({ projectId: diagram.projectId, activeVersion: activeVersion ?? null });
    setCurrentVersionId(activeVersion?.id ?? null);
  }, [diagram.projectId, activeVersion?.id]);

  const docsGuard = useTierGuard('documents');
  const sbomGuard = useTierGuard('sbom');

  const handleCloseAttackPaths = () => {
    setShowAttackPaths(false);
    setHighlightedPath(null);
  };

  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col bg-[#faf9f7] overflow-hidden">
        <Toolbar
          diagramId={diagram.id}
          diagramName={diagram.name}
          onOpenTemplates={() => setShowTemplates(true)}
          onOpenAI={() => setShowAI(true)}
          onOpenVersions={() => setShowVersions((v) => !v)}
          onOpenAttackPaths={() => setShowAttackPaths((v) => !v)}
          onOpenDocuments={() => docsGuard.allowed ? setShowDocuments((v) => !v) : docsGuard.showPaywall()}
          onOpenNotes={() => setShowNotes((v) => !v)}
          versionsOpen={showVersions}
          attackPathsOpen={showAttackPaths}
          documentsOpen={showDocuments}
          notesOpen={showNotes}
          user={user}
          onFreezeBaseline={() => setShowFreezeModal(true)}
          onBranchProject={() => {/* replaced by version freeze */}}
        />
        {(docsGuard.paywallVisible || sbomGuard.paywallVisible) && (
          <PaywallModal
            currentTier={docsGuard.paywallVisible ? docsGuard.tier : sbomGuard.tier}
            requiredTier="pro"
            onClose={docsGuard.paywallVisible ? docsGuard.hidePaywall : sbomGuard.hidePaywall}
          />
        )}

        {/* ── Project-level tab bar ─────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-1 border-b border-[#e5e1d8] bg-white px-4">
          <button
            onClick={() => setActiveTab('design')}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'design'
                ? 'border-[#1a1714] text-[#1a1714]'
                : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
            ].join(' ')}
          >
            <PenLine className="h-3.5 w-3.5" />
            Design &amp; Risk Assessment
          </button>
          <button
            onClick={() => {
              if (!sbomGuard.allowed) { sbomGuard.showPaywall(); return; }
              setActiveTab('operations');
            }}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'operations'
                ? 'border-[#1a1714] text-[#1a1714]'
                : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
            ].join(' ')}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Operations &amp; Vulnerabilities
            {!sbomGuard.allowed && <Lock className="h-3 w-3 text-[#c0bab4]" />}
          </button>
          <button
            onClick={() => {
              if (!sbomGuard.allowed) { sbomGuard.showPaywall(); return; }
              setActiveTab('csaf');
            }}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'csaf'
                ? 'border-[#1a1714] text-[#1a1714]'
                : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
            ].join(' ')}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            CSAF Advisory
            {!sbomGuard.allowed && <Lock className="h-3 w-3 text-[#c0bab4]" />}
          </button>
        </div>

        {activeTab === 'design' && <BaselineBanner />}

        {/* ── Design & TARA tab content ─────────────────────────────────────── */}
        {activeTab === 'design' && (
          <div className="flex flex-1 overflow-hidden">
            <ComponentSidebar />
            <main data-tour="canvas" className="relative flex-1 overflow-hidden bg-[#eeeae4]">
              <ZoomChip />
              <DiagramCanvas
                diagramId={diagram.id}
                userId={user.id}
                userName={user.name}
                userColor={user.color}
                highlightedPath={highlightedPath}
              />
            </main>
            {/* Tour anchor divs – always in DOM so joyride can find targets for detail-panel steps */}
            <div className="relative shrink-0">
              <div data-tour="threats-list" className="absolute right-full top-[15%] w-1 h-1 pointer-events-none" />
              <div data-tour="iec-dropdown" className="absolute right-full top-[30%] w-1 h-1 pointer-events-none" />
              <div data-tour="risk-matrix" className="absolute right-full top-[48%] w-1 h-1 pointer-events-none" />
              <div data-tour="measures-tracker" className="absolute right-full top-[65%] w-1 h-1 pointer-events-none" />
            </div>
            <DetailPanel />
            {showVersions && (
              <VersionPanel
                diagramId={diagram.id}
                onClose={() => setShowVersions(false)}
                userName={user.name}
              />
            )}
            {showAttackPaths && (
              <AttackPathPanel
                onClose={handleCloseAttackPaths}
                onHighlight={(path) => setHighlightedPath(path)}
                highlightedPathId={highlightedPath?.id ?? null}
              />
            )}
            {showDocuments && (
              <DocumentsPanel
                projectId={diagram.projectId}
                onClose={() => setShowDocuments(false)}
              />
            )}
          </div>
        )}

        {/* ── Operations & Vulnerabilities tab content ──────────────────────── */}
        {activeTab === 'operations' && sbomGuard.allowed && currentVersionId && (
          <div className="flex flex-1 overflow-hidden">
            <OperationsView projectId={diagram.projectId} versionId={currentVersionId} />
          </div>
        )}

        {/* ── CSAF Advisory tab content ─────────────────────────────────────── */}
        {activeTab === 'csaf' && sbomGuard.allowed && (
          <div className="flex flex-1 overflow-hidden">
            <CsafWizardView
              projectId={diagram.projectId}
              projectName={diagram.name}
              companyName={user.companyName}
            />
          </div>
        )}

        <footer className="flex h-6 shrink-0 items-center border-t border-[#e5e1d8] bg-white px-3 gap-4 text-[11px] text-[#6b6460]">
          {activeTab === 'design' ? (
            <>
              <span>{t.footer.clickNode}</span>
              <span>·</span>
              <span><kbd className="rounded bg-[#f4f1ec] px-1 font-mono text-[#6b6460]">Del</kbd> {t.footer.deleteHint}</span>
            </>
          ) : activeTab === 'csaf' ? (
            <span>CyberRisk Canvas · CSAF Advisory Wizard - CSAF 2.0 / CycloneDX VEX 1.4</span>
          ) : (
            <span>CyberRisk Canvas · Operations Module</span>
          )}
        </footer>
      </div>

      {showTemplates && <TemplateModal onClose={() => setShowTemplates(false)} />}
      {showAI && <AIAnalysisModal diagramName={diagram.name} onClose={() => setShowAI(false)} />}
      {showNotes && (
        <ProjectNotesPanel
          projectId={diagram.projectId}
          initialNotes={diagram.initialNotes}
          initialUpdatedByName={diagram.notesUpdatedByName}
          initialUpdatedAt={diagram.notesUpdatedAt}
          currentUserName={user.name}
          onClose={() => setShowNotes(false)}
        />
      )}
      <OnboardingTour userId={user.id} />

      {showFreezeModal && (
        <FreezeModal
          projectId={diagram.projectId}
          onSuccess={(newVersionId, newVersionNumber) => {
            setVersionFrozen(
              { id: activeVersion?.id ?? '', number: activeVersion?.number ?? 1, status: 'frozen', label: '', frozenAt: new Date().toISOString(), frozenByName: null },
              { id: newVersionId, number: newVersionNumber, status: 'active', label: '', frozenAt: null, frozenByName: null },
            );
            setCurrentVersionId(newVersionId);
            setShowFreezeModal(false);
          }}
          onClose={() => setShowFreezeModal(false)}
        />
      )}
    </ReactFlowProvider>
  );
}
