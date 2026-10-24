import type { Content } from 'pdfmake/interfaces';
import type { DeclarationDoc } from './docGenerators';
import { BRAND, downloadPdf, inline, pdfDocument } from './pdf';

const GREY = '#6b6460';

/** Simple renderer for the generated Markdown (headings, lists, quotes, paragraphs). */
export function exportMarkdownPdf(markdown: string, filename: string) {
  const content: Content[] = [];
  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    if (!line) content.push({ text: '', margin: [0, 0, 0, 2] });
    else if (line.startsWith('# ')) content.push({ text: line.slice(2), fontSize: 17, bold: true, color: BRAND, margin: [0, 0, 0, 8] });
    else if (line.startsWith('## ')) content.push({ text: line.slice(3), fontSize: 12.5, bold: true, margin: [0, 6, 0, 4] });
    else if (line.startsWith('### ')) content.push({ text: line.slice(4), fontSize: 10.5, bold: true, margin: [0, 3, 0, 2] });
    else if (line.startsWith('> ')) content.push({ text: line.slice(2), fontSize: 9, italics: true, color: GREY, margin: [0, 0, 0, 6] });
    else if (line.startsWith('- ')) content.push({ ...inline(`•  ${line.slice(2)}`), margin: [9, 0, 0, 2] });
    else content.push({ ...inline(line), margin: [0, 0, 0, 3] });
  }
  return downloadPdf(pdfDocument(content, { pageMargins: [51, 51, 51, 51] }), filename);
}

export function exportDeclarationPdf(d: DeclarationDoc, filename: string) {
  const content: Content[] = [
    { text: d.title, fontSize: 18, bold: true, color: BRAND, margin: [0, 0, 0, 6] },
    { text: d.draftNote, fontSize: 8.5, italics: true, color: '#b45309', margin: [0, 0, 0, 14] },
    ...d.rows.flatMap(([label, value]): Content[] => [
      { text: label, fontSize: 9, bold: true, margin: [0, 0, 0, 1] },
      { text: value, margin: [9, 0, 0, 8] },
    ]),
    ...d.statements.map((s): Content => ({ text: s, margin: [0, 6, 0, 3] })),
    { text: `${d.signature.place}: ____________________________`, margin: [0, 24, 0, 20] },
    { text: `${d.signature.signer}: ____________________________`, margin: [0, 0, 0, 28] },
    { text: d.simplified.heading, fontSize: 11, bold: true, margin: [0, 0, 0, 5] },
    { text: d.simplified.text, margin: [0, 0, 0, 5] },
    ...(d.simplified.full ? [{ text: d.simplified.full } as Content] : []),
  ];
  return downloadPdf(pdfDocument(content, { pageMargins: [51, 51, 51, 51] }), filename);
}
