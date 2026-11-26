import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectWriteAccess } from '@/lib/access';
import { audit } from '@/lib/audit';

interface RouteContext { params: Promise<{ id: string; tokenId: string }> }

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id: projectId, tokenId } = await ctx.params;
  try {
    await assertProjectWriteAccess(projectId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const token = await prisma.ciToken.findFirst({ where: { id: tokenId, projectId }, select: { id: true, name: true, prefix: true } });
  if (!token) return NextResponse.json({ error: 'CI token not found' }, { status: 404 });

  await prisma.ciToken.delete({ where: { id: tokenId } });
  audit({
    action: 'ci_token.delete',
    actorId: session.user.id,
    actorEmail: session.user.email,
    targetType: 'ci_token',
    targetId: token.id,
    details: { projectId, name: token.name, prefix: token.prefix },
  });
  return NextResponse.json({ ok: true });
}
