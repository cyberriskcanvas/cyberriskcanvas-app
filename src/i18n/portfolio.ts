import { useLanguageStore } from '@/store/languageStore';

const en = {
  orgTitle: 'Organisation',
  orgOpen: 'Open organisation',
  orgHint: 'What the CRA requires of you as the manufacturer, once for all products.',
  frozen: (n: number) => `${n} frozen`,
  cards: 'Cards', table: 'Table',
  roadmap: (done: number, total: number) => `Roadmap ${done}/${total}`,
  allDone: 'Roadmap complete',
  gate: { pass: 'Gate passed', fail: 'Gate failed', unknown: 'No gate result yet', pro: 'Gate: Pro' },
  high: (n: number) => `${n} high+ open`,
  art14: (open: number, overdue: number) => (overdue > 0 ? `Art. 14: ${overdue} overdue` : `Art. 14: ${open} open`),
  support: (days: number) => (days >= 0 ? `Support ${days} days` : `Support ended ${-days} days ago`),
  assessment: { none: '', open: 'Assessment open', approved: 'Approved', rejected: 'Rejected' } as Record<string, string>,
  cols: { product: 'Product', cls: 'Class', version: 'Version / release', roadmap: 'Roadmap', gate: 'Release gate', high: 'High+ findings', art14: 'Art. 14', support: 'Support', assessment: 'Assessment' },
  none: '-', pro: 'Pro',
};

const de: typeof en = {
  orgTitle: 'Organisation',
  orgOpen: 'Organisation öffnen',
  orgHint: 'Was der CRA von Ihnen als Hersteller verlangt, einmal für alle Produkte.',
  frozen: (n) => `${n} eingefroren`,
  cards: 'Karten', table: 'Tabelle',
  roadmap: (done, total) => `Fahrplan ${done}/${total}`,
  allDone: 'Fahrplan abgeschlossen',
  gate: { pass: 'Gate bestanden', fail: 'Gate nicht bestanden', unknown: 'Noch kein Gate-Ergebnis', pro: 'Gate: Pro' },
  high: (n) => `${n} High+ offen`,
  art14: (open, overdue) => (overdue > 0 ? `Art. 14: ${overdue} überfällig` : `Art. 14: ${open} offen`),
  support: (days) => (days >= 0 ? `Support ${days} Tage` : `Support seit ${-days} Tagen beendet`),
  assessment: { none: '', open: 'Assessment offen', approved: 'Freigegeben', rejected: 'Abgelehnt' },
  cols: { product: 'Produkt', cls: 'Klasse', version: 'Version / Release', roadmap: 'Fahrplan', gate: 'Release-Gate', high: 'High+-Funde', art14: 'Art. 14', support: 'Support', assessment: 'Assessment' },
  none: '-', pro: 'Pro',
};

export function usePortfolioT() {
  const lang = useLanguageStore((s) => s.lang);
  return { t: { en, de }[lang], lang };
}
