import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext { params: Promise<{ keyId: string }> }

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { keyId } = await ctx.params;

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, userId: session.user.id },
    select: { id: true },
  });

  if (!key) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id: keyId } });

  return NextResponse.json({ ok: true });
}
