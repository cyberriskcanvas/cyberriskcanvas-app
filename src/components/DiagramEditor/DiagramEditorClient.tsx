'use client';

import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DiagramCanvas } from '@/components/Canvas/DiagramCanvas';
import { ComponentSidebar } from '@/components/Sidebar/ComponentSidebar';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { ZoomChip } from '@/components/Toolbar/ZoomChip';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { TemplateModal } from '@/components/Templates/TemplateModal';
import { VersionPanel } from '@/components/Versioning/VersionPanel';
import { ModelCheckPanel } from '@/components/ModelCheck/ModelCheckPanel';
import { DocumentsView } from '@/components/Documents/DocumentsView';
import { AIAnalysisModal, Art14Banner, AttackPathPanel, CsafWizardView, OperationsView } from '@/pro/ui';
import { ProjectNotesPanel } from '@/components/Canvas/ProjectNotesPanel';
import { JourneyView } from '@/components/Tasks/JourneyView';
import { useJourneyT } from '@/i18n/journey';
import { NextStepBar } from './NextStepBar';
import { useJourneyStore } from '@/store/journeyStore';
import { useTierGuard } from '@/hooks/useTierGuard';
import { PaywallModal } from '@/components/Paywall/PaywallModal';
import { BaselineBanner } from '@/components/Baseline/BaselineBanner';
import { FreezeModal } from '@/components/Baseline/FreezeModal';
import { useDiagramStore } from '@/store/diagramStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useProjectStore } from '@/store/projectStore';
import type { DiagramNode, DiagramEdge } from '@/types';
import type { AttackPath } from '@/utils/attackPaths';
import { Lock, PenLine, ShieldAlert, FileCheck2, FileText, ListChecks } from 'lucide-react';

import { useT } from '@/hooks/useT';
import { OnboardingTour, resetOnboardingTour } from '@/components/Onboarding/OnboardingTour';

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
  iec62443: boolean;
}

type ProjectTab = 'tasks' | 'design' | 'operations' | 'documents' | 'csaf';

export default function DiagramEditorClient({ diagram, user, activeVersion, iec62443 }: Props) {
  const t = useT();
  const journeyT = useJourneyT();
  // A project always opens on the roadmap
  const [activeTab, setActiveTab] = useState<ProjectTab>('tasks');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showAttackPaths, setShowAttackPaths] = useState(false);
  const [showModelCheck, setShowModelCheck] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<AttackPath | null>(null);
  // Track current versionId for operations/CSAF tabs - updates after a successful freeze
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(activeVersion?.id ?? null);

  const { setNodes, setEdges, setViewport, setDiagramId } = useDiagramStore();
  const { setTier } = useSubscriptionStore();
  const { setProject, setVersionFrozen } = useProjectStore();
  // Roadmap data for the roadmap tab and the next-step bar, refreshed on every tab change
  const loadJourney = useJourneyStore((s) => s.load);
  useEffect(() => { loadJourney(diagram.projectId); }, [loadJourney, diagram.projectId, activeTab]);
  const [csafStep, setCsafStep] = useState<'gate' | 'reporting'>('gate');
  const openTab = (tab: ProjectTab, step?: 'reporting') => {
    if (tab === 'documents' && !docsGuard.allowed) { docsGuard.showPaywall(); return; }
    if ((tab === 'operations' || tab === 'csaf') && !sbomGuard.allowed) { sbomGuard.showPaywall(); return; }
    if (tab === 'csaf') setCsafStep(step ?? 'gate');
    setActiveTab(tab);
  };

  useEffect(() => {
    setDiagramId(diagram.id);
    setNodes((diagram.nodes as DiagramNode[]) ?? []);
    setEdges((diagram.edges as DiagramEdge[]) ?? []);
    setViewport(diagram.viewport);
  }, [diagram.id]);

  useEffect(() => {
    setTier((user.tier as 'free' | 'pro') ?? 'free');
  }, [user.tier]);

  // The IEC option only comes from the server when a project is opened: a freeze or a new version must not undo a change made in the product data
  useEffect(() => {
    setProject({ projectId: diagram.projectId, activeVersion: activeVersion ?? null, iec62443 });
  }, [diagram.projectId]);

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
      <div className="flex h-screen flex-col bg-[#faf9f7] text-[#1a1917] overflow-hidden">
        <Toolbar
          diagramId={diagram.id}
          diagramName={diagram.name}
          onOpenTemplates={() => setShowTemplates(true)}
          onOpenAI={() => setShowAI(true)}
          onOpenVersions={() => setShowVersions((v) => !v)}
          onOpenAttackPaths={() => { setShowAttackPaths((v) => !v); setShowModelCheck(false); setHighlightedPath(null); }}
          onOpenModelCheck={() => { setShowModelCheck((v) => !v); setShowAttackPaths(false); setHighlightedPath(null); }}
          canvasTools={activeTab === 'design'}
          onOpenNotes={() => setShowNotes((v) => !v)}
          versionsOpen={showVersions}
          attackPathsOpen={showAttackPaths}
          modelCheckOpen={showModelCheck}
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
            onClick={() => setActiveTab('tasks')}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'tasks'
                ? 'border-[#1a1714] text-[#1a1714]'
                : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
            ].join(' ')}
          >
            <ListChecks className="h-3.5 w-3.5" />
            {journeyT.tab}
          </button>
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
            {journeyT.tabs.design}
          </button>
          <button
            onClick={() => openTab('operations')}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'operations'
                ? 'border-[#1a1714] text-[#1a1714]'
                : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
            ].join(' ')}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {journeyT.tabs.operations}
            {!sbomGuard.allowed && <Lock className="h-3 w-3 text-[#c0bab4]" />}
          </button>
          <button
            onClick={() => openTab('documents')}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'documents'
                ? 'border-[#1a1714] text-[#1a1714]'
                : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
            ].join(' ')}
          >
            <FileText className="h-3.5 w-3.5" />
            {journeyT.tabs.documents}
            {!docsGuard.allowed && <Lock className="h-3 w-3 text-[#c0bab4]" />}
          </button>
          <button
            onClick={() => openTab('csaf')}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'csaf'
                ? 'border-[#1a1714] text-[#1a1714]'
                : 'border-transparent text-[#9b9590] hover:text-[#3d3a36]',
            ].join(' ')}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            {journeyT.tabs.csaf}
            {!sbomGuard.allowed && <Lock className="h-3 w-3 text-[#c0bab4]" />}
          </button>
        </div>

        <Art14Banner projectId={diagram.projectId} refreshKey={activeTab} onOpen={() => openTab('csaf', 'reporting')} />
        {activeTab !== 'tasks' && <NextStepBar currentTab={activeTab} onNavigate={openTab} onOpenRoadmap={() => setActiveTab('tasks')} />}

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
            {showModelCheck && (
              <ModelCheckPanel
                projectId={diagram.projectId}
                onClose={() => { setShowModelCheck(false); setHighlightedPath(null); }}
                onHighlight={(path) => setHighlightedPath(path)}
              />
            )}
          </div>
        )}

        {/* ── CRA roadmap (Fahrplan) ────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="flex flex-1 overflow-hidden">
            <JourneyView
              projectId={diagram.projectId}
              diagramId={diagram.id}
              productName={diagram.name}
              onNavigate={openTab}
              userId={user.id}
              onStartTour={() => { resetOnboardingTour(user.id); setActiveTab('design'); }}
              onOpenModelCheck={() => { setShowAttackPaths(false); setShowModelCheck(true); setActiveTab('design'); }}
            />
          </div>
        )}

        {/* ── Operations & Vulnerabilities tab content ──────────────────────── */}
        {activeTab === 'operations' && sbomGuard.allowed && currentVersionId && (
          <div className="flex flex-1 overflow-hidden">
            <OperationsView projectId={diagram.projectId} versionId={currentVersionId} />
          </div>
        )}

        {/* ── Documents tab content ─────────────────────────────────────────── */}
        {activeTab === 'documents' && docsGuard.allowed && (
          <div className="flex flex-1 overflow-hidden">
            <DocumentsView projectId={diagram.projectId} />
          </div>
        )}

        {/* ── Advisories & reporting tab content ─────────────────────────────────────── */}
        {activeTab === 'csaf' && sbomGuard.allowed && (
          <div className="flex flex-1 overflow-hidden">
            <CsafWizardView
              key={csafStep}
              initialStep={csafStep}
              projectId={diagram.projectId}
              projectName={diagram.name}
              companyName={user.companyName}
            />
          </div>
        )}

        <footer className="flex h-6 shrink-0 items-center border-t border-[#e5e1d8] bg-white px-3 gap-4 text-[11px] text-[#6b6460]">
          {activeTab === 'tasks' ? (
            <span>CyberRisk Canvas · {journeyT.title}</span>
          ) : activeTab === 'design' ? (
            <>
              <span>{t.footer.clickNode}</span>
              <span>·</span>
              <span><kbd className="rounded bg-[#f4f1ec] px-1 font-mono text-[#6b6460]">Del</kbd> {t.footer.deleteHint}</span>
            </>
          ) : activeTab === 'documents' ? (
            <span>CyberRisk Canvas · {journeyT.tabs.documents}</span>
          ) : activeTab === 'csaf' ? (
            <span>CyberRisk Canvas · CSAF Advisory Wizard - CSAF 2.0 / 2.1 / CycloneDX VEX 1.4</span>
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
      <OnboardingTour userId={user.id} active={activeTab === 'design'} />

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
