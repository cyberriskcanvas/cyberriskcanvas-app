'use client';

import { useState } from 'react';
import { X, Lock } from 'lucide-react';

interface Props {
  featureLabel?: string;
  onDismiss?: () => void;
}

export function UpgradeBanner({ featureLabel, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">
          {featureLabel ? `${featureLabel} requires a Pro license` : 'Pro license required'}
        </p>
        <p className="mt-1 text-amber-700 dark:text-amber-400">
          Contact your administrator to activate a Pro license.
        </p>
      </div>
      {onDismiss && (
        <button onClick={dismiss} className="shrink-0 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
