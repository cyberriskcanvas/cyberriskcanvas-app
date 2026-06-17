import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

interface RouteContext { params: Promise<{ keyId: string }> }

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { keyId } = await ctx.params;

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: session.user.id },
    select: { id: true, name: true, prefix: true },
  });

  if (!key) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id: keyId } });

  audit({
    action: 'api_key.delete',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'api_key',
    targetId: keyId,
    details: { name: key.name, prefix: key.prefix },
  });

  return NextResponse.json({ ok: true });
}
