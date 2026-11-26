import type { AssessmentDetail } from '@/actions/assessment';
import { CRA_REQUIREMENTS } from '@/data/cra';
import { assessmentTranslations } from '@/i18n/assessment';
import { MM, WHITE, dataTable, downloadPdf, pdfDocument, topBand } from './pdf';

export function exportAssessmentPdf(productName: string, a: AssessmentDetail, lang: 'en' | 'de') {
  const t = assessmentTranslations[lang];
  const status = t.status[a.status as 'open' | 'approved' | 'rejected'] ?? a.status;
  const title = new Map(CRA_REQUIREMENTS.map((r) => [r.id, r.title]));
  const rows = a.items.map((i) => [
    i.requirementId,
    title.get(i.requirementId) ?? '',
    t.verdict[i.verdict],
    [i.comment, i.dueDate ? `${t.due}: ${new Date(i.dueDate).toLocaleDateString(lang)}` : '', i.response ? `${t.response}: ${i.response}` : '', i.resolved ? t.isResolved : ''].filter(Boolean).join('\n'),
  ]);
  const definition = pdfDocument(
    [
      { text: t.title, fontSize: 18, bold: true, color: WHITE },
      { text: `${productName} · ${t.version(a.versionNumber, a.versionLabel)}`, color: WHITE, margin: [0, 3, 0, 42] },
      { text: `${status} · ${t.assessor}: ${a.assessorName}${a.decidedAt ? ` · ${new Date(a.decidedAt).toLocaleDateString(lang)}` : ''}`, margin: [0, 0, 0, 6] },
      ...(a.summary ? [{ text: a.summary, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),
      dataTable(['ID', lang === 'de' ? 'Anforderung' : 'Requirement', lang === 'de' ? 'Urteil' : 'Verdict', lang === 'de' ? 'Anmerkungen' : 'Notes'], rows, { fontSize: 7.5, widths: { 0: 14, 1: 60, 2: 25 }, padding: 2 }),
    ],
    { background: topBand(32 * MM), pageMargins: [40, 36, 40, 40] },
  );
  return downloadPdf(definition, `Assessment-${productName.replace(/\s+/g, '-')}-v${a.versionNumber}.pdf`);
}
