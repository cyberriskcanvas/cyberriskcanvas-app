'use server';

import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PAGE_SIZE = 100;

export interface AuditLogEntryDTO {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
}

export interface AuditLogPage {
  entries: AuditLogEntryDTO[];
  hasMore: boolean;
}

export async function listAuditLog(offset = 0): Promise<AuditLogPage> {
  await requireAdmin();

  const skip = Number.isInteger(offset) && offset > 0 ? offset : 0;
  const rows = await prisma.auditLogEntry.findMany({
    orderBy: { createdAt: 'desc' },
    skip,
    take: PAGE_SIZE + 1,
  });

  return {
    hasMore: rows.length > PAGE_SIZE,
    entries: rows.slice(0, PAGE_SIZE).map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      actorId: r.actorId,
      actorEmail: r.actorEmail,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      details: (r.details as Record<string, unknown> | null) ?? null,
    })),
  };
}
