import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OrganisationClient from '@/components/Organisation/OrganisationClient';

export const metadata: Metadata = {
  title: 'Organisation',
  description: 'What the CRA requires of the manufacturer, set once for all products.',
  robots: { index: false, follow: false },
};

export default async function OrganisationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return <OrganisationClient />;
}
