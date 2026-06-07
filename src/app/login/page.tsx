import type { Metadata } from 'next';
import { auth, getSsoProviders } from '@/lib/auth';
import { getTier } from '@/lib/tierLimits';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { redirect } from 'next/navigation';
import LoginClient from '@/components/Login/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In - CyberRisk Canvas',
  description: 'Sign in to your CyberRisk Canvas account to manage your cybersecurity risk assessments.',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  const tier = await getTier();
  const ssoProviders = TIER_CONFIG[tier].sso ? getSsoProviders() : [];

  return <LoginClient ssoProviders={ssoProviders} />;
}
