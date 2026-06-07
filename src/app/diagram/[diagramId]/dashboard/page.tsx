import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDiagram } from '@/actions/diagrams';
import { getActiveVersion } from '@/actions/baselines';
import DashboardClient from '@/components/Dashboard/DashboardClient';

interface Props {
  params: Promise<{ diagramId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { diagramId } = await params;
  try {
    const diagram = await getDiagram(diagramId);
    return { title: `${diagram.name} Dashboard - CyberRisk Canvas` };
  } catch {
    return { title: 'Dashboard - CyberRisk Canvas' };
  }
}

export default async function DashboardPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { diagramId } = await params;
  const diagram = await getDiagram(diagramId);
  const activeVersion = await getActiveVersion(diagram.projectId);

  return (
    <DashboardClient
      diagramId={diagramId}
      projectId={diagram.projectId}
      diagramName={diagram.name}
      initialNodes={diagram.nodes as unknown[]}
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
