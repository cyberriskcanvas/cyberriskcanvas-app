import jsPDF from 'jspdf';
import type { DeclarationDoc } from './docGenerators';

const BRAND: [number, number, number] = [79, 70, 229];
const MARGIN = 18;
const WIDTH = 210 - 2 * MARGIN;

function newDoc(): { doc: jsPDF; y: number } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  return { doc, y: MARGIN };
}

/** Writes wrapped text, adding pages when needed; returns the new y. */
function write(doc: jsPDF, text: string, y: number, opts: { size: number; bold?: boolean; indent?: number; gap?: number; italic?: boolean; color?: [number, number, number] }): number {
  doc.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal');
  doc.setFontSize(opts.size);
  doc.setTextColor(...(opts.color ?? [17, 24, 39]));
  const lines = doc.splitTextToSize(text, WIDTH - (opts.indent ?? 0)) as string[];
  const lineH = opts.size * 0.42;
  for (const line of lines) {
    if (y + lineH > 297 - MARGIN) { doc.addPage(); y = MARGIN; }
    doc.text(line, MARGIN + (opts.indent ?? 0), y);
    y += lineH;
  }
  return y + (opts.gap ?? 2);
}

/** Simple renderer for the generated Markdown (headings, lists, quotes, paragraphs). */
export function exportMarkdownPdf(markdown: string, filename: string) {
  const { doc, y: startY } = newDoc();
  let y = startY;
  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    if (!line) { y += 1; continue; }
    if (line.startsWith('# ')) y = write(doc, line.slice(2), y, { size: 17, bold: true, gap: 4, color: BRAND });
    else if (line.startsWith('## ')) y = write(doc, line.slice(3), y + 2, { size: 12.5, bold: true, gap: 2 });
    else if (line.startsWith('### ')) y = write(doc, line.slice(4), y + 1, { size: 10.5, bold: true, gap: 1 });
    else if (line.startsWith('> ')) y = write(doc, line.slice(2), y, { size: 9, italic: true, gap: 3, color: [107, 100, 96] });
    else if (line.startsWith('- ')) y = write(doc, `•  ${line.slice(2).replace(/\*\*/g, '')}`, y, { size: 10, indent: 3, gap: 1 });
    else y = write(doc, line.replace(/\*\*/g, ''), y, { size: 10, gap: 2 });
  }
  doc.save(filename);
}

export function exportDeclarationPdf(d: DeclarationDoc, filename: string) {
  const { doc, y: startY } = newDoc();
  let y = startY;
  y = write(doc, d.title, y, { size: 18, bold: true, gap: 3, color: BRAND });
  y = write(doc, d.draftNote, y, { size: 8.5, italic: true, gap: 6, color: [180, 83, 9] });
  for (const [label, value] of d.rows) {
    y = write(doc, label, y, { size: 9, bold: true, gap: 0.5 });
    y = write(doc, value, y, { size: 10, indent: 3, gap: 3.5 });
  }
  y += 2;
  for (const s of d.statements) y = write(doc, s, y, { size: 10, gap: 3 });
  y += 8;
  y = write(doc, `${d.signature.place}: ____________________________`, y, { size: 10, gap: 8 });
  y = write(doc, `${d.signature.signer}: ____________________________`, y, { size: 10, gap: 10 });
  y = write(doc, d.simplified.heading, y, { size: 11, bold: true, gap: 2 });
  y = write(doc, d.simplified.text, y, { size: 10, gap: 2 });
  if (d.simplified.full) write(doc, d.simplified.full, y, { size: 10, gap: 2 });
  doc.save(filename);
}
