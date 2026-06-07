'use client';

import { createContext, useContext, type ReactNode } from 'react';

export interface LicenseContextValue {
  isPro: boolean;
  isTrial: boolean;
}

const LicenseContext = createContext<LicenseContextValue>({ isPro: false, isTrial: false });

export function LicenseProvider({
  isPro,
  isTrial,
  children,
}: {
  isPro: boolean;
  isTrial: boolean;
  children: ReactNode;
}) {
  return <LicenseContext.Provider value={{ isPro, isTrial }}>{children}</LicenseContext.Provider>;
}

export function useLicense(): LicenseContextValue {
  return useContext(LicenseContext);
}
