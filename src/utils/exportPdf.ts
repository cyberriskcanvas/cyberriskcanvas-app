import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DiagramSummary } from './aggregateDiagram';

const BRAND = [79, 70, 229] as [number, number, number]; // brand-600 indigo
const DARK = [17, 24, 39] as [number, number, number];

function addPageHeader(doc: jsPDF, _title: string, pageNum: number, totalPages: number) {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CyberRisk Canvas - Risk Assessment Report', 10, 8);
  doc.text(`Page ${pageNum} / ${totalPages}`, 200, 8, { align: 'right' });
  doc.setTextColor(...DARK);
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND);
  doc.text(text, 14, y);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(14, y + 2, 196, y + 2);
  doc.setTextColor(...DARK);
  return y + 10;
}

export async function exportPdf(diagramName: string, summary: DiagramSummary): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const date = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });

  // ─── Cover page ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Risk Assessment Report', 14, 35);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(diagramName, 14, 47);

  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const coverY = 75;
  doc.text(`Generated: ${date}`, 14, coverY);
  doc.text('Tool: CyberRisk Canvas', 14, coverY + 7);
  doc.text(`IEC 62443 Compliance Score: ${summary.globalScore !== null ? `${summary.globalScore}%` : 'N/A'}`, 14, coverY + 14);
  doc.text(`CRA Compliance Score: ${summary.craGlobalScore !== null ? `${summary.craGlobalScore}%` : 'N/A'}`, 14, coverY + 21);

  // Executive summary box
  const execY = coverY + 30;
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, execY, 182, 50, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 20, execY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const stats = [
    [`Components: ${summary.components.length}`, `Assets: ${summary.assets.length}`],
    [`Threats: ${summary.threats.length}`, `Total Risks: ${summary.risks.length}`],
    [`Critical/High Risks: ${(summary.riskCounts['critical'] ?? 0) + (summary.riskCounts['high'] ?? 0)}`, `Measures: ${summary.measures.length}`],
    [`IEC 62443: ${summary.globalScore !== null ? `${summary.globalScore}%` : '-'}`, `CRA: ${summary.craGlobalScore !== null ? `${summary.craGlobalScore}%` : '-'}`],
  ];
  stats.forEach(([left, right], i) => {
    doc.text(left, 20, execY + 18 + i * 8);
    doc.text(right, 110, execY + 18 + i * 8);
  });

  // ─── Page 2: Components ───────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Components', 2, 9);

  let y = sectionTitle(doc, '1. System Components', 22);
  if (summary.components.length === 0) {
    doc.setFontSize(9);
    doc.text('No components defined.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Type', 'SL-T', 'Assets', 'Threats', 'Risks', 'Measures']],
      body: summary.components.map((c) => [
        String(c.label),
        c.type,
        String(c.data.securityLevel ?? '-'),
        String((c.data.assets as unknown[] | undefined)?.length ?? 0),
        String((c.data.threats as unknown[] | undefined)?.length ?? 0),
        String((c.data.risks as unknown[] | undefined)?.length ?? 0),
        String((c.data.measures as unknown[] | undefined)?.length ?? 0),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
  }

  // ─── Page 3: Threats ─────────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Threats', 3, 9);
  y = sectionTitle(doc, '2. Threat Analysis', 22);

  if (summary.threats.length === 0) {
    doc.setFontSize(9); doc.text('No threats defined.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Threat Name', 'STRIDE', 'CWE-ID', 'Description']],
      body: summary.threats.map((t) => [
        t.componentLabel, t.name, t.stride, t.cweId ?? '-', t.description ?? '-',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: { 4: { cellWidth: 55 } },
    });
  }

  // ─── Page 4: Risks ────────────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Risks', 4, 9);
  y = sectionTitle(doc, '3. Risk Assessment', 22);

  const riskLevelColors: Record<string, [number, number, number]> = {
    critical: [220, 38, 38], high: [249, 115, 22],
    medium: [234, 179, 8], low: [34, 197, 94], negligible: [107, 114, 128],
  };

  if (summary.risks.length === 0) {
    doc.setFontSize(9); doc.text('No risks defined.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Linked Threat', 'Likelihood', 'Impact', 'Score', 'Level', 'Status']],
      body: summary.risks.map((r) => [
        r.componentLabel,
        r.threatName ?? '-',
        String(r.likelihood),
        String(r.impact),
        String(r.likelihood * r.impact),
        r.level.toUpperCase(),
        r.status,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      didParseCell: (data) => {
        if (data.column.index === 5 && data.section === 'body') {
          const level = data.cell.raw?.toString().toLowerCase() ?? '';
          const color = riskLevelColors[level];
          if (color) {
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
  }

  // ─── Page 5: IEC 62443 ────────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'IEC 62443', 5, 9);
  y = sectionTitle(doc, '4. IEC 62443 Compliance', 22);

  if (summary.compliance.length === 0) {
    doc.setFontSize(9); doc.text('No Security Levels assigned to components.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Component', 'SL-T', 'Part', 'Score', 'Compliant', 'Partial', 'Non-Compliant', 'Total Req.']],
      body: summary.compliance.map((c) => [
        c.componentLabel, `SL-${c.sl}`, `IEC 62443-${c.part}`,
        `${c.score}%`, String(c.compliant), String(c.partial), String(c.nonCompliant), String(c.total),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
  }

  // ─── Page 6: CRA Compliance ───────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'CRA', 6, 9);
  y = sectionTitle(doc, '5. CRA Compliance (EU 2024/2847)', 22);

  if (summary.craCompliance.length === 0) {
    doc.setFontSize(9); doc.text('No CRA mappings defined for any component.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Score', 'Compliant', 'Partial', 'Non-Compliant']],
      body: summary.craCompliance.map((c) => [
        c.componentLabel,
        `${c.score}%`,
        String(c.compliant),
        String(c.partial),
        String(c.nonCompliant),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
  }

  // ─── Page 7: Measures ─────────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Measures', 7, 9);
  y = sectionTitle(doc, '6. Security Measures', 22);

  if (summary.measures.length === 0) {
    doc.setFontSize(9); doc.text('No measures defined.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Measure', 'Status', 'Owner', 'Due Date', 'Evidence / Accepted By']],
      body: summary.measures.map((m) => [
        m.componentLabel,
        m.title,
        m.status,
        m.owner ?? '-',
        m.dueDate ?? '-',
        m.riskAccepted ? `Accepted by: ${m.acceptedBy ?? '-'}` : (m.evidenceLink ?? '-'),
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: { 5: { cellWidth: 50 } },
    });
  }

  // ─── Page 8: Traceability Matrix ──────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Traceability', 8, 9);
  y = sectionTitle(doc, '7. Traceability Matrix', 22);

  if (summary.traceabilityRows.length === 0) {
    doc.setFontSize(9); doc.text('No measures defined.', 14, y);
  } else {
    const GREEN: [number, number, number] = [34, 197, 94];
    const RED: [number, number, number] = [239, 68, 68];
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Threat', 'Risk Level', 'Measure', 'Resolution', 'Evidence / Accepted By', 'Complete']],
      body: summary.traceabilityRows.map((r) => [
        r.componentLabel,
        r.threatName,
        r.riskLevel.toUpperCase(),
        r.measureTitle,
        r.riskAccepted ? 'Risk Accepted' : 'Measure',
        r.riskAccepted ? (r.acceptedBy ?? '-') : (r.evidenceLink ?? '-'),
        r.complete ? '✓' : '✗',
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      columnStyles: { 5: { cellWidth: 40 } },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.section === 'body') {
          const val = data.cell.raw?.toString();
          data.cell.styles.textColor = val === '✓' ? GREEN : RED;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.halign = 'center';
        }
      },
    });
  }

  // ─── Page 9: Assets ───────────────────────────────────────────────────────────
  doc.addPage();
  addPageHeader(doc, 'Assets', 9, 9);
  y = sectionTitle(doc, '8. Asset Register', 22);

  if (summary.assets.length === 0) {
    doc.setFontSize(9); doc.text('No assets defined.', 14, y);
  } else {
    autoTable(doc, {
      startY: y,
      head: [['Component', 'Asset Name', 'Category', 'Description']],
      body: summary.assets.map((a) => [a.componentLabel, a.name, a.category, a.description ?? '-']),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 255] },
    });
  }

  doc.save(`CRA-${diagramName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
