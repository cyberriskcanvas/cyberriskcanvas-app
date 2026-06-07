'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectAccess } from '@/lib/access';

export interface DocumentMeta {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
}

export async function listDocuments(projectId: string): Promise<DocumentMeta[]> {
  const session = await requireSession();
  await assertProjectAccess(projectId, session.user.id);

  return prisma.projectDocument.findMany({
    where: { projectId },
    select: { id: true, name: true, size: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
