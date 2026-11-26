import { type NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { listComponents } from '@/lib/inventory';
import { resolveCiVersion } from '@/lib/ciVersion';
import { visibleProjectIds } from '@/actions/projects';

/**
 * Component inventory of the products the caller can see.
 * ?q=  part of a purl, name or license, or a CVE/GHSA id (aliases: purl, name, license, cve)
 * ?project=<id>[&version=N]  one product (and version) instead of all
 */
export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!TIER_CONFIG[authResult.tier].sbom) return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const query = (['q', 'purl', 'name', 'license', 'cve'].map((k) => p.get(k)).find(Boolean) ?? '').trim().slice(0, 200);
  const project = p.get('project');
  if (!query && !project) return NextResponse.json({ error: 'Pass q (purl, name, license or CVE) or project' }, { status: 400 });

  let projectIds = await visibleProjectIds(authResult.userId); // null = all products
  if (project) {
    if (projectIds && !projectIds.includes(project)) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    projectIds = [project];
  }

  let versionIds: string[] | undefined;
  if (project && p.get('version')) {
    const version = await resolveCiVersion(project, p.get('version'));
    if (!version) return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
    versionIds = [version.id];
  } else if (project) {
    const version = await resolveCiVersion(project, null);
    versionIds = version ? [version.id] : [];
  }

  return NextResponse.json(await listComponents({ projectIds: projectIds ?? undefined, versionIds, query }));
}
