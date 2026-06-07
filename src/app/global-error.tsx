'use client';

import { useEffect } from 'react';

/**
 * Catches errors thrown in the root layout itself (e.g. getLicenseInfo()
 * failing) - app/error.tsx cannot, since it renders inside that layout.
 * Must render its own <html>/<body>: it replaces the root layout entirely.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[root-layout-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#faf9f7] px-6 font-sans text-[#1a1917]">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-[#e5e1d8] bg-white p-8 text-center">
          <h1 className="text-base font-bold">CyberRisk Canvas failed to load</h1>
          <p className="text-sm text-[#6b6460]">
            An unexpected error occurred while starting the application.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-[#9b9388]">Error reference: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="rounded-lg bg-[#1e293b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0f172a]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
