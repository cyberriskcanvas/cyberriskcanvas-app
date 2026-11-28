import type { Metadata } from 'next';
import { auth, getSsoProviders } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginClient from '@/components/Login/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your CyberRisk Canvas account to manage your cybersecurity risk assessments.',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  const ssoProviders = getSsoProviders();

  return <LoginClient ssoProviders={ssoProviders} />;
}
