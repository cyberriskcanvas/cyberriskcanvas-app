import { useLanguageStore } from '@/store/languageStore';

// ponytail: only the freeze badge is translated; the rest of the version panel is still hardcoded English.
const en = {
  frozen: 'frozen',
  frozenHint: 'Snapshot of a frozen version. Kept permanently as an audit record.',
};

const de: typeof en = {
  frozen: 'eingefroren',
  frozenHint: 'Snapshot einer eingefrorenen Version. Bleibt dauerhaft als Audit-Nachweis erhalten.',
};

export function useVersioningT() {
  const lang = useLanguageStore((s) => s.lang);
  return { en, de }[lang];
}
