import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listUsers } from '@/actions/auth';
import { listAlertChannels } from '@/features/server';
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

  const [users, teams, alertChannels, auditLog] = await Promise.all([
    listUsers(),
    prisma.team.findMany({
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    listAlertChannels(),
    listAuditLog(),
  ]);

  return (
    <AdminClient
      initialUsers={users}
      initialTeams={teams}
      initialAlertChannels={alertChannels}
      initialAuditLog={auditLog}
    />
  );
}
