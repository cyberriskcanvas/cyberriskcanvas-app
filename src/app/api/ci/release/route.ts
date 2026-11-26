import { type NextRequest, NextResponse } from 'next/server';
import { authenticateCiToken } from '@/lib/apiAuth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getTier } from '@/lib/tierLimits';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { computeGate, parseGateParams } from '@/lib/ciGateRun';
import { freezeActiveVersion } from '@/lib/freeze';

/**
 * Release from the pipeline: when the gate passes, the active version is frozen
 * with ?label=<tag> and a new working version opens. 422 with the reasons when
 * the gate fails (nothing is frozen). A retried job with the same label is a no-op.
 */
export async function POST(req: NextRequest) {
  const ci = await authenticateCiToken(req);
  if (!ci) return NextResponse.json({ error: 'Invalid or missing CI token' }, { status: 401 });
  const tier = TIER_CONFIG[await getTier()];
  if (!tier.api || !tier.baselines) {
    return NextResponse.json({ error: 'This feature requires a valid Pro license.' }, { status: 403 });
  }

  const q = new URL(req.url).searchParams;
  const label = (q.get('label') ?? '').trim().slice(0, 128);
  if (!label) return NextResponse.json({ error: 'label is required (e.g. the release tag)' }, { status: 400 });
  const params = parseGateParams(q);
  if ('error' in params) return NextResponse.json({ error: params.error }, { status: 400 });

  const already = await prisma.projectVersion.findFirst({
    where: { projectId: ci.projectId, status: 'frozen', label },
    select: { number: true },
  });
  if (already) return NextResponse.json({ released: true, alreadyReleased: true, version: already.number });

  const active = await prisma.projectVersion.findFirst({ where: { projectId: ci.projectId, status: 'active' }, orderBy: { number: 'desc' }, select: { id: true, number: true } });
  if (!active) return NextResponse.json({ error: 'No active version' }, { status: 404 });

  const gate = await computeGate(ci.projectId, active.id, params);
  if (!gate.pass) return NextResponse.json({ released: false, ...gate, version: active.number }, { status: 422 });

  const token = await prisma.ciToken.findUnique({ where: { id: ci.tokenId }, select: { name: true } });
  const frozenByName = `CI (${token?.name ?? 'token'})`;
  const { frozenNumber, nextVersion } = await freezeActiveVersion({ projectId: ci.projectId, label, frozenByName });

  audit({
    action: 'version.freeze',
    targetType: 'version',
    targetId: active.id,
    details: { projectId: ci.projectId, number: frozenNumber, label, frozenByName, via: 'ci' },
  });

  return NextResponse.json({ released: true, version: frozenNumber, label, newVersion: nextVersion.number });
}
