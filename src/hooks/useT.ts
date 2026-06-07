import { useLanguageStore } from '@/store/languageStore';
import { translations } from '@/i18n/diagram';

export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  return translations[lang];
}
