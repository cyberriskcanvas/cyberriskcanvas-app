'use client';

// Core edition: stand-ins for the Pro components (see src/pro/ui.tsx in CyberRisk Canvas Pro).
// They keep the free code compiling and show where a Pro feature would be.

import type { NodeData } from '@/types';
import type { AttackPath } from '@/utils/attackPaths';
import type { DiagramSummary } from '@/utils/aggregateDiagram';

const PRO_URL = 'https://cyberriskcanvas.com/#pricing';

function ProNotice({ feature }: { feature: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#faf9f7] p-6">
      <div className="max-w-md rounded-xl border border-[#e5e1d8] bg-white p-6 text-center text-sm text-[#3d3a36]">
        <p className="font-semibold">{feature}</p>
        <p className="mt-1 text-[#6b6460]">This is part of CyberRisk Canvas Pro.</p>
        <a href={PRO_URL} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg bg-[#1a1714] px-4 py-2 font-medium text-white">See Pro</a>
      </div>
    </div>
  );
}

export function OperationsView(_: { projectId: string; versionId: string }) {
  return <ProNotice feature="SBOM, vulnerability management and CI/CD release gate" />;
}

export function CsafWizardView(_: { projectId: string; projectName: string; companyName?: string; initialStep?: 'gate' | 'metadata' | 'preview' | 'reporting' }) {
  return <ProNotice feature="CSAF advisories and CRA Art. 14 reporting" />;
}

export function Art14Banner(_: { projectId: string; refreshKey: string; onOpen: () => void }) {
  return null;
}

export function AttackPathPanel(_: { onClose: () => void; onHighlight: (path: AttackPath | null) => void; highlightedPathId: string | null }) {
  return null;
}

export function AIAnalysisModal(_: { diagramName: string; onClose: () => void }) {
  return null;
}

export function AISuggestCwe(_: { nodeId: string; nodeType: string; data: NodeData }) {
  return null;
}

export function AISuggestIEC(_: { nodeType: string; data: NodeData }) {
  return null;
}

export function AlertChannelsSection(_: { isPro: boolean; initialChannels: unknown[] }) {
  return null;
}

export function AssessmentPanel({ onClose }: { projectId: string; productName: string; onClose: () => void; onChanged: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <ProNotice feature="Assessor review and approval" />
    </div>
  );
}

export async function exportPdf(..._args: [string, DiagramSummary, ...unknown[]]): Promise<void> {
  window.open(PRO_URL, '_blank');
}
