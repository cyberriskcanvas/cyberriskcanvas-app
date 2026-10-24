import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AREA_LABEL } from '@/data/readinessQuestions';
import { readinessTranslations } from '@/i18n/readiness';
import type { ReadinessResult } from './readiness';

/** One-page-plus report of the self-assessment (English or German, like the UI language). */
export function exportReadinessPdf(productName: string, result: ReadinessResult, lang: 'en' | 'de') {
  const t = readinessTranslations[lang];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(t.title, 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${productName} · ${new Date().toLocaleDateString(lang)}`, 14, 23);

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.overall}: ${result.overall}%`, 14, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(t.answered(result.answered, result.total), 14, 48);

  autoTable(doc, {
    startY: 54,
    head: [[lang === 'de' ? 'Bereich' : 'Area', lang === 'de' ? 'Reifegrad' : 'Readiness', lang === 'de' ? 'Beantwortet' : 'Answered']],
    body: result.areas.map((a) => [AREA_LABEL[a.area][lang], `${a.score}%`, `${a.answered}/${a.total}`]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
  });

  const afterAreas = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(t.gaps, 14, afterAreas + 10);
  autoTable(doc, {
    startY: afterAreas + 14,
    head: [[lang === 'de' ? 'Frage' : 'Question', lang === 'de' ? 'Antwort' : 'Answer', lang === 'de' ? 'Hinweis' : 'Hint']],
    body: result.gaps.map((g) => [g.question.q[lang], t.gapAnswer[g.answer ?? 'unanswered'], g.question.hint[lang]]),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 25 } },
  });
  const end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(t.disclaimer, 14, end + 8);
  doc.save(`CRA-readiness-${productName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
