import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requireTierFeature, TierError } from '@/lib/tierGuard';
import { generateApiKey } from '@/lib/apiAuth';
import { audit } from '@/lib/audit';

const MAX_KEYS_PER_USER = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    await requireTierFeature('api');
  } catch (err) {
    if (err instanceof TierError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 100);
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const count = await prisma.apiKey.count({ where: { userId: session.user.id } });
  if (count >= MAX_KEYS_PER_USER) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_KEYS_PER_USER} API keys per user.` },
      { status: 400 },
    );
  }

  const { raw, hash, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyHash: hash,
      prefix,
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  audit({
    action: 'api_key.create',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'api_key',
    targetId: apiKey.id,
    details: { name: apiKey.name, prefix: apiKey.prefix },
  });

  // raw is returned ONCE - it cannot be recovered from the stored hash
  return NextResponse.json({
    id: apiKey.id,
    name: apiKey.name,
    prefix: apiKey.prefix,
    createdAt: apiKey.createdAt.toISOString(),
    key: raw,
  });
}
