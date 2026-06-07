import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDiagram } from '@/actions/diagrams';
import { getActiveVersion } from '@/actions/baselines';
import { getProjectNotes } from '@/actions/projects';
import DiagramEditorClient from '@/components/DiagramEditor/DiagramEditorClient';

interface Props {
  params: Promise<{ diagramId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { diagramId } = await params;
  try {
    const diagram = await getDiagram(diagramId);
    return { title: `${diagram.name} - CyberRisk Canvas` };
  } catch {
    return { title: 'Diagram - CyberRisk Canvas' };
  }
}

export default async function DiagramEditorPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { diagramId } = await params;
  const diagram = await getDiagram(diagramId);
  const [activeVersion, projectNotes] = await Promise.all([
    getActiveVersion(diagram.projectId),
    getProjectNotes(diagram.projectId),
  ]);

  return (
    <DiagramEditorClient
      diagram={{
        id: diagram.id,
        name: diagram.name,
        projectId: diagram.projectId,
        nodes: diagram.nodes as unknown[],
        edges: diagram.edges as unknown[],
        viewport: diagram.viewport as { x: number; y: number; zoom: number },
        initialNotes: projectNotes.notes,
        notesUpdatedByName: projectNotes.notesUpdatedByName,
        notesUpdatedAt: projectNotes.notesUpdatedAt,
      }}
      user={{
        id: session.user.id,
        name: session.user.name ?? '',
        color: session.user.color,
        tier: session.user.tier,
        companyLogo: session.user.companyLogo ?? undefined,
        companyName: session.user.companyName ?? undefined,
      }}
      activeVersion={activeVersion ? {
        id: activeVersion.id,
        number: activeVersion.number,
        status: activeVersion.status as 'active' | 'frozen',
        label: activeVersion.label,
        frozenAt: activeVersion.frozenAt?.toISOString() ?? null,
        frozenByName: activeVersion.frozenByName ?? null,
      } : null}
    />
  );
}
