'use client';

// The only way free code reaches Pro components. The public core edition ships pro-stubs/ui.tsx in
// place of this file (scripts/export-core.mjs), so the Pro sources never leave the private repository.
export { OperationsView } from '@/components/Operations/OperationsView';
export { CsafWizardView } from '@/components/Csaf/CsafWizardView';
export { Art14Banner } from '@/components/DiagramEditor/Art14Banner';
export { AttackPathPanel } from '@/components/AttackPaths/AttackPathPanel';
export { AIAnalysisModal } from '@/components/AI/AIAnalysisModal';
export { AISuggestCwe } from '@/components/AI/AISuggestCwe';
export { AISuggestIEC } from '@/components/AI/AISuggestIEC';
export { AlertChannelsSection } from '@/components/Admin/AlertChannelsSection';
export { AssessmentPanel } from '@/components/Tasks/AssessmentPanel';
export { exportPdf } from '@/utils/exportPdf';

/** False in the core edition: links to Pro-only pages and downloads are left out there instead of ending in a 404. */
export const PRO_EDITION = true;
