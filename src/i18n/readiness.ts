import { useLanguageStore } from '@/store/languageStore';

const en = {
  open: 'Self-assessment',
  title: 'CRA readiness self-assessment',
  intro: 'Answer honestly: "don\'t know" counts like "no" until you find out. Organisation-wide questions are answered once for all products.',
  answers: { yes: 'Yes', partly: 'Partly', no: 'No', unknown: "Don't know" },
  scopeOrg: 'Whole organisation',
  scopeProduct: 'This product',
  orgAdminOnly: 'Only administrators can answer organisation-wide questions.',
  tabQuestions: 'Questions',
  tabResult: 'Result',
  overall: 'Overall readiness',
  answered: (a: number, t: number) => `${a} of ${t} questions answered`,
  gaps: 'Gaps, most important first',
  noGaps: 'No gaps: every question is answered with "yes".',
  gapAnswer: { no: 'No', unknown: "Don't know", partly: 'Partly', unanswered: 'Not answered' },
  goToStation: 'Go to the station',
  report: 'Download PDF report',
  close: 'Close',
  disclaimer: 'A self-assessment is a planning aid, not a conformity assessment.',
};

const de: typeof en = {
  open: 'Selbsteinschätzung',
  title: 'CRA-Reifegrad (Selbsteinschätzung)',
  intro: 'Antworten Sie ehrlich: „Weiß nicht" zählt wie „Nein", bis Sie es geklärt haben. Fragen zur ganzen Organisation beantworten Sie einmal für alle Produkte.',
  answers: { yes: 'Ja', partly: 'Teilweise', no: 'Nein', unknown: 'Weiß nicht' },
  scopeOrg: 'Ganze Organisation',
  scopeProduct: 'Dieses Produkt',
  orgAdminOnly: 'Fragen zur ganzen Organisation können nur Administratoren beantworten.',
  tabQuestions: 'Fragen',
  tabResult: 'Ergebnis',
  overall: 'Gesamt-Reifegrad',
  answered: (a, t) => `${a} von ${t} Fragen beantwortet`,
  gaps: 'Lücken, Wichtigstes zuerst',
  noGaps: 'Keine Lücken: Alle Fragen sind mit „Ja" beantwortet.',
  gapAnswer: { no: 'Nein', unknown: 'Weiß nicht', partly: 'Teilweise', unanswered: 'Nicht beantwortet' },
  goToStation: 'Zur Station',
  report: 'PDF-Bericht herunterladen',
  close: 'Schließen',
  disclaimer: 'Eine Selbsteinschätzung ist eine Planungshilfe, keine Konformitätsbewertung.',
};

export function useReadinessT() {
  const lang = useLanguageStore((s) => s.lang);
  return { t: { en, de }[lang], lang };
}
export const readinessTranslations = { en, de };
