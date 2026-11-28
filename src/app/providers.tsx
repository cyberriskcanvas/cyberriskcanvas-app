'use client';

import { SessionProvider } from 'next-auth/react';
import '@/lib/insecureContext'; // crypto.randomUUID / clipboard fallbacks for http deployments

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
