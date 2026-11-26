import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { assertProjectWriteAccess } from '@/lib/access';
import { detectFormat, normaliseComponents, type Bom } from '@/lib/sbomParse';
import { ingestSbom, MAX_COMPONENTS } from '@/lib/sbomIngest';

// ─── Route handler ────────────────────────────────────────────────────────────

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: RouteContext) {
  const authResult = await authenticateRequest(req);
  if (!authResult) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!TIER_CONFIG[authResult.tier].sbom) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const { id: projectId } = await ctx.params;

  try {
    await assertProjectWriteAccess(projectId, authResult.userId);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
  }

  let bom: Bom;
  try {
    bom = JSON.parse(await file.text()) as Bom;
  } catch {
    return NextResponse.json({ error: 'File is not valid JSON' }, { status: 400 });
  }

  const format = detectFormat(bom);
  if (!format) {
    return NextResponse.json({ error: 'File must be a CycloneDX or SPDX BOM' }, { status: 400 });
  }

  const components = normaliseComponents(bom);
  if (components.length === 0) {
    return NextResponse.json({ error: 'No components found in SBOM' }, { status: 400 });
  }
  if (components.length > MAX_COMPONENTS) {
    return NextResponse.json({ error: `SBOM has ${components.length} components, the limit is ${MAX_COMPONENTS}` }, { status: 400 });
  }

  const activeVersion = await prisma.projectVersion.findFirst({
    where: { projectId, status: 'active' },
    orderBy: { number: 'desc' },
  });
  if (!activeVersion) {
    return NextResponse.json({ error: 'No active version found for this project.' }, { status: 409 });
  }

  const result = await ingestSbom({ projectId, versionId: activeVersion.id, fileName: file.name, format, components });
  return NextResponse.json(result);
}
