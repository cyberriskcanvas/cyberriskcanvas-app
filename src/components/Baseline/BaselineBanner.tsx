'use client';

import { Lock } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useChromeT } from '@/i18n/chrome';

export function BaselineBanner() {
  const { activeVersion } = useProjectStore();
  const { t, lang } = useChromeT();

  if (!activeVersion || activeVersion.status !== 'frozen') return null;

  const date = activeVersion.frozenAt
    ? new Date(activeVersion.frozenAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')
    : '';

  return (
    <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <Lock size={15} className="shrink-0 text-amber-600" />
      <span>
        <strong>{t.banner.frozen(activeVersion.number, activeVersion.label ?? null)}</strong>
        {activeVersion.frozenByName && t.banner.by(activeVersion.frozenByName)}
        {date && t.banner.on(date)}
        {t.banner.readOnly}
      </span>
    </div>
  );
}
