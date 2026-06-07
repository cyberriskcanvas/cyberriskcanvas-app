'use client';

import { SessionProvider } from 'next-auth/react';
import { LicenseProvider } from '@/lib/licenseContext';

export function Providers({ isPro, isTrial, children }: { isPro: boolean; isTrial: boolean; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LicenseProvider isPro={isPro} isTrial={isTrial}>
        {children}
      </LicenseProvider>
    </SessionProvider>
  );
}
