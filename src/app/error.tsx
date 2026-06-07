'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-[#e5e1d8] bg-white p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AlertTriangle size={22} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[#1a1917]">Something went wrong</h1>
          <p className="mt-1 text-sm text-[#6b6460]">
            An unexpected error occurred. You can try again, or head back to your projects.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-[#9b9388]">Error reference: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e293b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            <RotateCw size={14} />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e1d8] px-4 py-2 text-sm font-medium text-[#1a1917] transition-colors hover:bg-[#f5f3ef]"
          >
            Back to projects
          </Link>
        </div>
      </div>
    </div>
  );
}
