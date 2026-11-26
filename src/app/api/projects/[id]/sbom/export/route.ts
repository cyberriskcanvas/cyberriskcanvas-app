import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { canAccessProject } from '@/lib/access';
import { getOrg } from '@/lib/organisationStore';
import { loadFindings } from '@/lib/findings';
import { buildVex } from '@/lib/vex';
import {
  generateBsiCycloneDX16,
  generateBsiSpdx30,
  type BsiSbomComponentInput,
} from '@/lib/bsiSbom';
import type { DiagramNode, NodeData } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].sbom) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const { id: projectId } = await ctx.params;
  const hasAccess = await canAccessProject(projectId, authResult.userId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get('format') ?? 'cyclonedx';

  const [project, activeVersion, org] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        diagrams: {
          where: { deletedAt: null },
          take: 1,
          orderBy: { updatedAt: 'desc' },
        },
      },
    }),
    prisma.projectVersion.findFirst({
      where: { projectId, status: 'active' },
      orderBy: { number: 'desc' },
      include: {
        sboms: {
          include: {
            components: true,
          },
        },
      },
    }),
    getOrg(),
  ]);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Gather components from ProjectSbom and from Diagram nodes
  const componentMap = new Map<string, BsiSbomComponentInput>();

  // 1. Ingested SBOM components if present
  const dbSboms = activeVersion?.sboms ?? [];
  for (const sbom of dbSboms) {
    for (const c of sbom.components) {
      if (!componentMap.has(c.key)) {
        const hashes = (Array.isArray(c.hashes) ? c.hashes : []) as Array<{ alg: string; content: string }>;
        componentMap.set(c.key, {
          name: c.name,
          version: c.version,
          purl: c.purl,
          filename: c.name,
          isExecutable: true,
          isStructured: true,
          concludedLicense: c.licenses[0] ?? undefined,
          deployableHashSha512: hashes.find((h) => h.alg.replace('-', '').toLowerCase() === 'sha512')?.content,
        });
      }
    }
  }

  // 2. Add canvas software nodes if any
  const latestDiagram = project.diagrams[0];
  if (latestDiagram?.nodes) {
    const nodes = latestDiagram.nodes as unknown as DiagramNode[];
    for (const n of nodes) {
      if (n.type === 'software' || n.data?.componentType) {
        const d = n.data as NodeData;
        const name = String(d.label || n.id);
        if (!componentMap.has(name)) {
          componentMap.set(name, {
            name,
            version: d.version ?? undefined,
            filename: d.actualFilename ?? (d.version ? `${name}-${d.version}` : name),
            isExecutable: d.isExecutable ?? true,
            isArchive: d.isArchive ?? false,
            isStructured: d.isStructured ?? true,
            concludedLicense: d.concludedLicense ?? undefined,
            deployableHashSha512: d.deployableHashSha512 ?? undefined,
            securityTxtUrl: d.securityTxtUrl ?? undefined,
          });
        }
      }
    }
  }

  const componentList = Array.from(componentMap.values());

  const options = {
    projectName: project.name,
    projectVersion: activeVersion ? `v${activeVersion.number}.0` : '1.0.0',
    projectDescription: project.description ?? undefined,
    authorEmail: org.contactDetails?.match(/[^\s<>,;]+@[^\s<>,;]+/)?.[0],
  };

  if (format.toLowerCase() === 'cyclonedx-vex') {
    const vex = buildVex(project.name, activeVersion ? await loadFindings({ versionIds: [activeVersion.id] }) : []);
    return new NextResponse(JSON.stringify(vex, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-vex.json"` },
    });
  }

  const isSpdx = format.toLowerCase() === 'spdx';
  const sbomPayload = isSpdx
    ? generateBsiSpdx30(componentList, options)
    : generateBsiCycloneDX16(componentList, options);

  const cleanFilename = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = isSpdx
    ? `${cleanFilename}-spdx-bsi-tr03183.json`
    : `${cleanFilename}-cyclonedx-bsi-tr03183.json`;

  return new NextResponse(JSON.stringify(sbomPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
