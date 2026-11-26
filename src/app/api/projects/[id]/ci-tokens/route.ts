import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectWriteAccess } from '@/lib/access';
import { requireTierFeature, TierError } from '@/lib/tierGuard';
import { generateApiKey } from '@/lib/apiAuth';
import { audit } from '@/lib/audit';

const MAX_TOKENS_PER_PROJECT = 10;

interface RouteContext { params: Promise<{ id: string }> }

async function authorize(ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) } as const;
  const { id: projectId } = await ctx.params;
  try {
    await assertProjectWriteAccess(projectId, session.user.id);
  } catch {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) } as const;
  }
  return { session, projectId } as const;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const a = await authorize(ctx);
  if ('error' in a) return a.error;
  const tokens = await prisma.ciToken.findMany({
    where: { projectId: a.projectId },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(tokens.map((t) => ({ ...t, lastUsedAt: t.lastUsedAt?.toISOString() ?? null, createdAt: t.createdAt.toISOString() })));
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const a = await authorize(ctx);
  if ('error' in a) return a.error;

  try {
    await requireTierFeature('api');
  } catch (err) {
    if (err instanceof TierError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = (body.name ?? '').trim().slice(0, 100);
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  if ((await prisma.ciToken.count({ where: { projectId: a.projectId } })) >= MAX_TOKENS_PER_PROJECT) {
    return NextResponse.json({ error: `Maximum of ${MAX_TOKENS_PER_PROJECT} CI tokens per project.` }, { status: 400 });
  }

  const { raw, hash, prefix } = generateApiKey('crci_');
  const token = await prisma.ciToken.create({
    data: { projectId: a.projectId, name, keyHash: hash, prefix, createdById: a.session.user.id },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  audit({
    action: 'ci_token.create',
    actorId: a.session.user.id,
    actorEmail: a.session.user.email,
    targetType: 'ci_token',
    targetId: token.id,
    details: { projectId: a.projectId, name: token.name, prefix: token.prefix },
  });

  // raw is returned ONCE - it cannot be recovered from the stored hash
  return NextResponse.json({ ...token, createdAt: token.createdAt.toISOString(), token: raw });
}
