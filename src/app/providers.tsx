'use client';

import { SessionProvider } from 'next-auth/react';
import { LicenseProvider } from '@/lib/licenseContext';
import '@/lib/insecureContext'; // crypto.randomUUID / clipboard fallbacks for http deployments

export function Providers({ isPro, isTrial, children }: { isPro: boolean; isTrial: boolean; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LicenseProvider isPro={isPro} isTrial={isTrial}>
        {children}
      </LicenseProvider>
    </SessionProvider>
  );
}
