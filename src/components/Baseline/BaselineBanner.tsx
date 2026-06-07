'use client';

import { Lock } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';

export function BaselineBanner() {
  const { activeVersion } = useProjectStore();

  if (!activeVersion || activeVersion.status !== 'frozen') return null;

  const date = activeVersion.frozenAt
    ? new Date(activeVersion.frozenAt).toLocaleDateString('de-DE')
    : '';

  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <Lock size={15} className="shrink-0 text-amber-600" />
      <span>
        <strong>Version {activeVersion.number}{activeVersion.label ? ` - ${activeVersion.label}` : ''} ist eingefroren</strong>
        {activeVersion.frozenByName && ` · freigegeben von ${activeVersion.frozenByName}`}
        {date && ` am ${date}`}
        . Keine Änderungen möglich.
      </span>
    </div>
  );
}
