'use server';

import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assertProjectWriteAccess } from '@/lib/access';
import { isGateSeverity } from '@/lib/ciGateRun';

/** Release gate threshold of the project: from which severity untriaged vulnerabilities and scan findings block. */
export async function setGateFailOn(projectId: string, failOn: string) {
  const session = await requireSession();
  await assertProjectWriteAccess(projectId, session.user.id);
  if (!isGateSeverity(failOn)) throw new Error('Unknown severity');
  await prisma.project.update({ where: { id: projectId }, data: { gateFailOn: failOn } });
}
