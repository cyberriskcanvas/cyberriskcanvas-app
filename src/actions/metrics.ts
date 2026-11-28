'use server';

import { assertProjectAccess } from '@/lib/access';
import { requireSession } from '@/lib/auth';
import { trend, type TrendPoint } from '@/lib/metrics';
import { visibleProjectIds } from './projects';

/** Open findings per day for one product, or for every product the user can see (projectId null). */
export async function getTrend(projectId: string | null, days = 90): Promise<TrendPoint[]> {
  const { user: { id: userId } } = await requireSession();
  if (projectId) {
    await assertProjectAccess(projectId, userId);
    return trend([projectId], days);
  }
  return trend(await visibleProjectIds(userId), days);
}
