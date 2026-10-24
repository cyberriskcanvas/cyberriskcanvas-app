'use client';

import { FlaskConical } from 'lucide-react';
import { useLicense } from '@/lib/licenseContext';
import { useChromeT } from '@/i18n/chrome';

export function TrialBanner() {
  const { isTrial } = useLicense();
  const { t } = useChromeT();
  if (!isTrial) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400">
      <FlaskConical size={13} className="shrink-0" />
      <span>
        <span className="font-semibold">{t.trial.label}</span>
        {' - '}
        {t.trial.body}
      </span>
    </div>
  );
}
