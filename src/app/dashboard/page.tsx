import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isReviewerOrAdmin } from '@/lib/access';
import { getProjects } from '@/actions/projects';
import ProjectListClient from '@/components/ProjectList/ProjectListClient';

export const metadata: Metadata = {
  title: 'My Projects - CyberRisk Canvas',
  description: 'Manage your cybersecurity risk assessment projects.',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const [canViewSecurity, projects] = await Promise.all([
    isReviewerOrAdmin(session.user.id, session.user.role),
    getProjects(),
  ]);

  return (
    <ProjectListClient
      initialProjects={projects as unknown as Parameters<typeof ProjectListClient>[0]['initialProjects']}
      canViewSecurity={canViewSecurity}
    />
  );
}
