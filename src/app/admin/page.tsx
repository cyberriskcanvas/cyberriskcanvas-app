import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listUsers } from '@/actions/auth';
import { getTier } from '@/lib/tierLimits';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { listAlertChannels } from '@/pro/server';
import { listAuditLog } from '@/actions/audit';
import AdminClient from '@/components/Admin/AdminClient';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const isPro = TIER_CONFIG[await getTier()].sbom;

  const [users, teams, alertChannels, auditLog] = await Promise.all([
    listUsers(),
    prisma.team.findMany({
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    isPro ? listAlertChannels() : Promise.resolve([]),
    listAuditLog(),
  ]);

  return (
    <AdminClient
      initialUsers={users}
      initialTeams={teams}
      isPro={isPro}
      initialAlertChannels={alertChannels}
      initialAuditLog={auditLog}
    />
  );
}
