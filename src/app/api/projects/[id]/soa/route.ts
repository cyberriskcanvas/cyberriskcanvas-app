import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { canAccessProject } from '@/lib/access';
import { aggregateDiagram } from '@/utils/aggregateDiagram';
import { generateStatementOfApplicability } from '@/data/tr03183h';
import type { DiagramNode, CRAMapping } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  const hasAccess = await canAccessProject(projectId, authResult.userId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get('format') ?? 'json';

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      diagrams: {
        take: 1,
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const latestDiagram = project.diagrams[0];
  const nodes = (latestDiagram?.nodes ?? []) as unknown as DiagramNode[];
  const summary = aggregateDiagram(nodes);

  // Extract all CRA mappings across all nodes
  const allMappings = summary.components.flatMap((c) => (c.data.cra ?? []) as CRAMapping[]);
  const soaRows = generateStatementOfApplicability(allMappings);

  const cleanFilename = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (format === 'csv') {
    const headers = ['Anforderungs-ID', 'Titel', 'CRA Referenz', 'Anwendbar', 'Status', 'Begründung / Nachweis'];
    const csvLines = [
      headers.join(';'),
      ...soaRows.map((r) =>
        [
          `"${r.requirementId}"`,
          `"${r.title.replace(/"/g, '""')}"`,
          `"${r.craRef}"`,
          r.applicable ? 'Ja' : 'Nein',
          `"${r.status}"`,
          `"${(r.justification || '').replace(/"/g, '""')}"`,
        ].join(';'),
      ),
    ];
    return new NextResponse(csvLines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${cleanFilename}-cra-soa.csv"`,
      },
    });
  }

  if (format === 'md') {
    const mdLines = [
      `# Statement of Applicability (SoA) - Cyber Resilience Act`,
      `**Produkt:** ${project.name}`,
      `**Datum:** ${new Date().toLocaleDateString('de-DE')}`,
      `**Standard:** BSI TR-03183-H §5.7 & CRA Art. 13(2)`,
      '',
      '| ID | Titel | CRA Referenz | Anwendbar | Status | Begründung / Nachweis |',
      '| :--- | :--- | :--- | :--- | :--- | :--- |',
      ...soaRows.map(
        (r) =>
          `| **${r.requirementId}** | ${r.title} | \`${r.craRef}\` | ${r.applicable ? '✅ Ja' : '❌ Nein'} | \`${r.status}\` | ${r.justification ?? '-'} |`,
      ),
    ];
    return new NextResponse(mdLines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${cleanFilename}-cra-soa.md"`,
      },
    });
  }

  return NextResponse.json({
    projectName: project.name,
    standard: 'BSI TR-03183-H & CRA Annex I',
    totalRequirements: soaRows.length,
    applicableCount: soaRows.filter((r) => r.applicable).length,
    rows: soaRows,
  });
}
