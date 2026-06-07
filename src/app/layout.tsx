import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getLicenseInfo } from '@/lib/license';
import { TrialBanner } from '@/components/TrialBanner/TrialBanner';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: {
    default: 'CyberRisk Canvas',
    template: '%s - CyberRisk Canvas',
  },
  description: 'Cybersecurity Engineering Platform for IEC 62443, EU CRA, and NIS-2.',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const license = await getLicenseInfo();
  const isPro = license.valid;
  const isTrial = false;

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-gray-950 text-gray-100 antialiased font-sans">
        <Providers isPro={isPro} isTrial={isTrial}>
          <TrialBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
