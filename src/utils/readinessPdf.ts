import { AREA_LABEL } from '@/data/readinessQuestions';
import { readinessTranslations } from '@/i18n/readiness';
import type { ReadinessResult } from './readiness';
import { MM, WHITE, dataTable, downloadPdf, pdfDocument, topBand } from './pdf';

/** One-page-plus report of the self-assessment (English or German, like the UI language). */
export function exportReadinessPdf(productName: string, result: ReadinessResult, lang: 'en' | 'de') {
  const t = readinessTranslations[lang];
  const h = (en: string, de: string) => (lang === 'de' ? de : en);
  const definition = pdfDocument(
    [
      { text: t.title, fontSize: 18, bold: true, color: WHITE },
      { text: `${productName} · ${new Date().toLocaleDateString(lang)}`, color: WHITE, margin: [0, 3, 0, 40] },
      { text: `${t.overall}: ${result.overall}%`, fontSize: 12, bold: true, margin: [0, 0, 0, 4] },
      { text: t.answered(result.answered, result.total), fontSize: 9, margin: [0, 0, 0, 10] },
      dataTable(
        [h('Area', 'Bereich'), h('Readiness', 'Reifegrad'), h('Answered', 'Beantwortet')],
        result.areas.map((a) => [AREA_LABEL[a.area][lang], `${a.score}%`, `${a.answered}/${a.total}`]),
        { fontSize: 9 },
      ),
      { text: t.gaps, fontSize: 11, bold: true, margin: [0, 18, 0, 6] },
      dataTable(
        [h('Question', 'Frage'), h('Answer', 'Antwort'), h('Hint', 'Hinweis')],
        result.gaps.map((g) => [g.question.q[lang], t.gapAnswer[g.answer ?? 'unanswered'], g.question.hint[lang]]),
        { widths: { 0: 80, 1: 25 }, padding: 2 },
      ),
      { text: t.disclaimer, fontSize: 8, italics: true, margin: [0, 10, 0, 0] },
    ],
    { background: topBand(30 * MM), pageMargins: [40, 36, 40, 40] },
  );
  return downloadPdf(definition, `CRA-readiness-${productName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
