import { prisma } from './db';

/**
 * Audit trail for security-relevant actions (user management, license
 * changes, deletions, …). Entries are written fire-and-forget: a failing
 * audit write is logged to stderr but never breaks the action itself.
 *
 * `details` must stay small and free of secrets - names, roles, hosts,
 * counts are fine; passwords, license keys, or webhook paths are not.
 */

export type AuditAction =
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.password_change'
  | 'account.delete'
  | 'license.save'
  | 'license.remove'
  | 'alert_channel.create'
  | 'alert_channel.update'
  | 'alert_channel.delete'
  | 'team.create'
  | 'team.delete'
  | 'team.member_add'
  | 'team.member_remove'
  | 'team.member_role_change'
  | 'api_key.create'
  | 'api_key.delete'
  | 'document.upload'
  | 'document.delete'
  | 'evidence.delete'
  | 'version.freeze'
  | 'version.branch';

export interface AuditEntry {
  action: AuditAction;
  /** null for system events (e.g. bootstrap). */
  actorId?: string | null;
  actorEmail?: string | null;
  targetType?: 'user' | 'license' | 'alert_channel' | 'team' | 'api_key' | 'document' | 'evidence' | 'project' | 'version';
  targetId?: string;
  details?: Record<string, string | number | boolean | null>;
}

export function audit(entry: AuditEntry): void {
  prisma.auditLogEntry
    .create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        details: entry.details ?? undefined,
      },
    })
    .catch((err) => console.error('[audit] failed to write entry:', err));
}
