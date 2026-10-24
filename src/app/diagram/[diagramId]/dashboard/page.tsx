import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDiagram } from '@/actions/diagrams';
import { getActiveVersion } from '@/actions/baselines';
import { getIec62443 } from '@/actions/projects';
import { getJourneyData, getDocContext } from '@/actions/productInfo';
import { annexViiCoverage, generateAnnexII, generateDeclaration } from '@/utils/docGenerators';
import { getModelCheckDismissed } from '@/actions/modelCheck';
import DashboardClient from '@/components/Dashboard/DashboardClient';

interface Props {
  params: Promise<{ diagramId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { diagramId } = await params;
  try {
    const diagram = await getDiagram(diagramId);
    return { title: `${diagram.name} · Reports & exports` };
  } catch {
    return { title: 'Reports & exports' };
  }
}

export default async function DashboardPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { diagramId } = await params;
  const diagram = await getDiagram(diagramId);
  const [activeVersion, iec62443, journey, modelDismissed, docs] = await Promise.all([getActiveVersion(diagram.projectId), getIec62443(diagram.projectId), getJourneyData(diagram.projectId), getModelCheckDismissed(diagram.projectId), getDocContext(diagram.projectId)]);
  const annexVii = annexViiCoverage(docs.data, docs.facts, generateAnnexII(docs.data, docs.facts, 'en').missing.length === 0, generateDeclaration(docs.data, docs.facts, 'en').missing.length === 0);

  return (
    <DashboardClient
      diagramId={diagramId}
      projectId={diagram.projectId}
      diagramName={diagram.name}
      initialNodes={diagram.nodes as unknown[]}
      iec62443={iec62443}
      craChecklist={journey.checklist}
      initialEdges={diagram.edges as unknown[]}
      modelDismissed={modelDismissed}
      annexVii={annexVii}
      lockState={{
        isLocked: activeVersion?.status === 'frozen',
        lockedLabel: activeVersion?.label ?? null,
        lockedByName: activeVersion?.frozenByName ?? null,
        lockedAt: activeVersion?.frozenAt?.toISOString() ?? null,
        parentId: null,
      }}
    />
  );
}
