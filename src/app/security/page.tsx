import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isReviewerOrAdmin } from '@/lib/access';
import { getSecurityOverview } from '@/actions/securityOverview';
import SecurityOverviewClient from '@/components/Security/SecurityOverviewClient';

export const metadata: Metadata = {
  title: 'Security Overview',
  description: 'Cross-project view of all components and vulnerabilities for the product security team.',
  robots: { index: false, follow: false },
};

export default async function SecurityOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  if (!(await isReviewerOrAdmin(session.user.id, session.user.role))) redirect('/dashboard');
  const overview = await getSecurityOverview();

  return <SecurityOverviewClient overview={overview} />;
}
