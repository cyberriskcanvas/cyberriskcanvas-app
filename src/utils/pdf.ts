import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

// Shared pieces of the generated PDFs (pdfmake): page setup, brand colours, tables, download.

export const BRAND = '#4f46e5';
export const DARK = '#111827';
export const WHITE = '#ffffff';
const STRIPE = '#f8faff';
/** pdfmake works in points: millimetres of the old layouts convert with this. */
export const MM = 2.835;
export const PAGE_WIDTH = 595.28;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

/** Roboto has no arrows or check marks: spell them out instead of printing a replacement glyph. */
const safe = (s: string) => s.replace(/[→⇒]/g, '->').replace(/✓/g, 'yes').replace(/✗/g, 'no');

export type Cell = string | { text: string; color?: string; bold?: boolean; alignment?: 'left' | 'center' | 'right' };

/** Table with a coloured header row that repeats on every page and striped rows. widths: column index -> millimetres, others share the rest. */
export function dataTable(head: string[], rows: Cell[][], opts: { fontSize?: number; widths?: Record<number, number>; padding?: number } = {}): Content {
  const { fontSize = 8, widths = {}, padding = 3 } = opts;
  return {
    fontSize,
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: head.map((_, i) => (widths[i] !== undefined ? widths[i] * MM : '*')),
      body: [
        head.map((h) => ({ text: h, bold: true, color: WHITE })),
        ...rows.map((r) => r.map((c) => (typeof c === 'string' ? { text: safe(c) } : { ...c, text: safe(c.text) }))),
      ],
    },
    layout: {
      fillColor: (row: number) => (row === 0 ? BRAND : row % 2 === 0 ? STRIPE : null),
      hLineWidth: () => 0.3,
      vLineWidth: () => 0,
      hLineColor: () => '#e5e7eb',
      paddingLeft: () => padding + 1,
      paddingRight: () => padding + 1,
      paddingTop: () => padding,
      paddingBottom: () => padding,
    },
  };
}

/** Section heading with a rule below; every section starts on a new page. */
export function section(text: string): Content[] {
  return [
    { text, fontSize: 13, bold: true, color: BRAND, pageBreak: 'before' },
    { canvas: [{ type: 'line', x1: 0, y1: 2, x2: CONTENT_WIDTH, y2: 2, lineWidth: 0.5, lineColor: BRAND }], margin: [0, 0, 0, 8] },
  ];
}

export const note = (text: string, fontSize = 9) => ({ text, fontSize });

/** `**bold**` inside a line becomes a bold run. */
export function inline(text: string): { text: Array<string | { text: string; bold: true }> } {
  const parts = text.split(/\*\*(.+?)\*\*/);
  return { text: parts.map((p, i) => (i % 2 === 1 ? { text: p, bold: true } : p)) };
}

/** Coloured band across the top of the first page (pass its height in points). */
export const topBand = (height: number) => (page: number): Content | null =>
  page === 1 ? { canvas: [{ type: 'rect', x: 0, y: 0, w: PAGE_WIDTH, h: height, color: BRAND }] } : null;

export function pdfDocument(content: Content, extra: Partial<TDocumentDefinitions> = {}): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [MARGIN, MARGIN, MARGIN, MARGIN],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: DARK },
    content,
    ...extra,
  };
}

/** pdfmake and its fonts (about 1 MB) load only when a PDF is made. */
export async function downloadPdf(definition: TDocumentDefinitions, filename: string): Promise<void> {
  const [pdfModule, fontModule] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  const pdfMake = (pdfModule as unknown as { default?: typeof pdfModule }).default ?? pdfModule;
  const vfs = (fontModule as unknown as { default?: Record<string, string> }).default ?? (fontModule as unknown as Record<string, string>);
  pdfMake.addVirtualFileSystem(vfs);
  await pdfMake.createPdf(definition).download(filename);
}
