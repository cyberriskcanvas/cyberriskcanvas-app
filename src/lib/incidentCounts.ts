import { prisma } from './db';
import { deadlines, type IncidentKind } from './craIncident';

/** Open Art. 14 reporting cases of a product, and how many of them have a deadline that passed. */
export async function incidentCounts(projectId: string): Promise<{ open: number; overdue: number }> {
  const open = await prisma.craIncident.findMany({
    where: { projectId, closedAt: null },
    select: { kind: true, awareAt: true, measureAvailableAt: true, earlyWarningAt: true, notificationAt: true, finalReportAt: true },
  });
  return { open: open.length, overdue: open.filter((i) => deadlines({ ...i, kind: i.kind as IncidentKind }).some((s) => s.state === 'overdue')).length };
}
