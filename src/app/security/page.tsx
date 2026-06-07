import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Lock, ShieldAlert } from 'lucide-react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isReviewerOrAdmin } from '@/lib/access';
import { getTier } from '@/lib/tierLimits';
import { TIER_CONFIG } from '@/lib/tierConfig';
import { getSecurityOverview } from '@/actions/securityOverview';
import SecurityOverviewClient from '@/components/Security/SecurityOverviewClient';

export const metadata: Metadata = {
  title: 'Security Overview - CyberRisk Canvas',
  description: 'Cross-project view of all components and vulnerabilities for the product security team.',
  robots: { index: false, follow: false },
};

export default async function SecurityOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  if (!(await isReviewerOrAdmin(session.user.id, session.user.role))) redirect('/dashboard');
  if (!TIER_CONFIG[await getTier()].sbom) return <SecurityOverviewLocked />;

  const overview = await getSecurityOverview();

  return <SecurityOverviewClient overview={overview} />;
}

/** Shown to admins/review-team members who would otherwise see the overview, but whose tier lacks SBOM/CVE monitoring. */
function SecurityOverviewLocked() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="border-b border-[#e5e1d8] bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e1d8] text-[#6b6460] transition-colors hover:bg-[#f5f3ef]"
            title="Back to projects"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e293b]">
            <ShieldAlert size={18} className="text-white" />
          </div>
          <h1 className="text-base font-bold text-[#1a1917]">Security Overview</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-start gap-3 rounded-xl border border-[#e5e1d8] bg-white p-6">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#6b6460]" />
          <div>
            <p className="text-sm font-semibold text-[#1a1917]">
              Security Overview is part of SBOM &amp; CVE Monitoring (Pro)
            </p>
            <p className="mt-1 text-sm text-[#6b6460]">
              Activate a Pro license to see components and vulnerabilities across all projects in one place.
            </p>
            <a
              href={process.env.NEXT_PUBLIC_LICENSE_URL ?? 'https://cyberriskcanvas.com/pricing'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1e293b] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#334155]"
            >
              Get a license
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
