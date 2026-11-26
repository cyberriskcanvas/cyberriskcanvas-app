import type { Content } from 'pdfmake/interfaces';
import { ANNEX_VII_POINTS } from '@/data/annexVII';
import type { AnnexViiRow } from './docGenerators';
import { checklistMappings, type CraChecklist } from '@/lib/craChecklist';
import { modelCheckTranslations } from '@/i18n/modelCheck';
import type { Finding } from './modelCheck';
import type { DiagramSummary } from './aggregateDiagram';
import { generateStatementOfApplicability } from '@/data/tr03183h';
import { BRAND, MM, PAGE_WIDTH, WHITE, dataTable, downloadPdf, note, pdfDocument, section, type Cell } from './pdf';

export interface PdfMethod {
  /** The project is also assessed against IEC 62443: scores, the IEC page and the SL column are part of the report. */
  iec62443: boolean;
  /** Threats come from the wizard's template draft, confirmed by the team. */
  templateBased: boolean;
  /** Suggestions of the guided TARA nobody confirmed; they are not part of the figures. */
  unconfirmed: { threats: number; assets: number };
}

export interface PdfModelCheck {
  open: Finding[];
  dismissed: Array<{ finding: Finding; reason: string }>;
}

const RISK_COLOR: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#22c55e', negligible: '#6b7280' };
const pct = (v: number | null, empty = 'N/A') => (v !== null ? `${v}%` : empty);
const count = (v: unknown) => String((v as unknown[] | undefined)?.length ?? 0);

export async function exportPdf(diagramName: string, summary: DiagramSummary, method?: PdfMethod, craChecklist: CraChecklist = {}, modelCheck?: PdfModelCheck, annexVii?: AnnexViiRow[]): Promise<void> {
  const iec = method?.iec62443 === true;
  const date = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
  let sectionNo = 0;
  const heading = (text: string) => section(`${++sectionNo}. ${text}`);

  // ─── Cover page ──────────────────────────────────────────────────────────────
  const critHigh = (summary.riskCounts['critical'] ?? 0) + (summary.riskCounts['high'] ?? 0);
  const stats = [
    [`Components: ${summary.components.length}`, `Assets: ${summary.assets.length}`],
    [`Threats: ${summary.threats.length}`, `Total Risks: ${summary.risks.length}`],
    [`Critical/High Risks: ${critHigh}`, `Measures: ${summary.measures.length}`],
    iec ? [`IEC 62443: ${pct(summary.globalScore, '-')}`, `CRA: ${pct(summary.craGlobalScore, '-')}`] : [`CRA: ${pct(summary.craGlobalScore, '-')}`, ''],
  ];
  const openUnconfirmed = method ? method.unconfirmed.threats + method.unconfirmed.assets : 0;
  const cover: Content[] = [
    { text: 'Risk Assessment Report', fontSize: 28, bold: true, color: WHITE, margin: [0, 40, 0, 0] },
    { text: diagramName, fontSize: 14, color: WHITE, margin: [0, 6, 0, 70] },
    { text: `Generated: ${date}`, margin: [0, 0, 0, 3] },
    { text: 'Tool: CyberRisk Canvas', margin: [0, 0, 0, 3] },
    ...(iec ? [{ text: `IEC 62443 Compliance Score: ${pct(summary.globalScore)}`, margin: [0, 0, 0, 3] as [number, number, number, number] }] : []),
    { text: `CRA Compliance Score: ${pct(summary.craGlobalScore)}`, margin: [0, 0, 0, 3] },
    ...(method ? [{
      text: `Method: ${method.templateBased ? 'TARA from a template-based draft, confirmed by the team' : 'Manual TARA'}` +
        (openUnconfirmed > 0 ? ` - ${method.unconfirmed.threats} threats and ${method.unconfirmed.assets} assets not yet confirmed, not included in the figures` : ''),
      margin: [0, 0, 0, 3] as [number, number, number, number],
    }] : []),
    {
      margin: [0, 24, 0, 0],
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: 'Executive Summary', fontSize: 11, bold: true, margin: [0, 0, 0, 8] },
            ...stats.map(([left, right]): Content => ({ columns: [{ text: left, width: '*' }, { text: right, width: '*' }], fontSize: 9, margin: [0, 0, 0, 5] })),
          ],
          margin: [6, 6, 6, 4],
        }]],
      },
      layout: { fillColor: () => '#eef2ff', hLineWidth: () => 0, vLineWidth: () => 0 },
    },
  ];

  // ─── Sections, one per page ──────────────────────────────────────────────────
  const components: Content[] = [
    ...heading('System Components'),
    summary.components.length === 0
      ? note('No components defined.')
      : dataTable(
          iec ? ['Component', 'Type', 'SL-T', 'Assets', 'Threats', 'Risks', 'Measures'] : ['Component', 'Type', 'Assets', 'Threats', 'Risks', 'Measures'],
          summary.components.map((c) => [
            String(c.label), c.type,
            ...(iec ? [String(c.data.securityLevel ?? '-')] : []),
            count(c.data.assets), count(c.data.threats), count(c.data.risks), count(c.data.measures),
          ]),
        ),
  ];

  const threats: Content[] = [
    ...heading('Threat Analysis'),
    summary.threats.length === 0
      ? note('No threats defined.')
      : dataTable(
          ['Component', 'Threat Name', 'STRIDE', 'CWE-ID', 'Description'],
          summary.threats.map((t) => [t.componentLabel, t.name, t.stride, t.cweId ?? '-', t.description ?? '-']),
          { fontSize: 7.5, widths: { 4: 55 } },
        ),
  ];

  const risks: Content[] = [
    ...heading('Risk Assessment'),
    summary.risks.length === 0
      ? note('No risks defined.')
      : dataTable(
          ['Component', 'Linked Threat', 'Likelihood', 'Impact', 'Score', 'Level', 'Status'],
          summary.risks.map((r): Cell[] => [
            r.componentLabel, r.threatName ?? '-', String(r.likelihood), String(r.impact), String(r.likelihood * r.impact),
            { text: r.level.toUpperCase(), color: RISK_COLOR[r.level.toLowerCase()], bold: RISK_COLOR[r.level.toLowerCase()] !== undefined },
            r.status,
          ]),
          { fontSize: 7.5 },
        ),
  ];

  const iecSection: Content[] = iec ? [
    ...heading('IEC 62443 Compliance'),
    summary.compliance.length === 0
      ? note('No Security Levels assigned to components.')
      : dataTable(
          ['Component', 'SL-T', 'Part', 'Score', 'Compliant', 'Partial', 'Non-Compliant', 'Total Req.'],
          summary.compliance.map((c) => [c.componentLabel, `SL-${c.sl}`, `IEC 62443-${c.part}`, `${c.score}%`, String(c.compliant), String(c.partial), String(c.nonCompliant), String(c.total)]),
        ),
  ] : [];

  const cra: Content[] = [
    ...heading('CRA Compliance (EU 2024/2847)'),
    summary.craCompliance.length === 0
      ? note('No CRA mappings defined for any component.')
      : dataTable(
          ['Component', 'Score', 'Compliant', 'Partial', 'Non-Compliant'],
          summary.craCompliance.map((c) => [c.componentLabel, `${c.score}%`, String(c.compliant), String(c.partial), String(c.nonCompliant)]),
        ),
  ];

  const measures: Content[] = [
    ...heading('Security Measures'),
    summary.measures.length === 0
      ? note('No measures defined.')
      : dataTable(
          ['Component', 'Measure', 'Status', 'Owner', 'Due Date', 'Evidence / Accepted By'],
          summary.measures.map((m) => [m.componentLabel, m.title, m.status, m.owner ?? '-', m.dueDate ?? '-', m.riskAccepted ? `Accepted by: ${m.acceptedBy ?? '-'}` : (m.evidenceLink ?? '-')]),
          { fontSize: 7.5, widths: { 5: 50 } },
        ),
  ];

  const traceability: Content[] = [
    ...heading('Traceability Matrix'),
    summary.traceabilityRows.length === 0
      ? note('No measures defined.')
      : dataTable(
          ['Component', 'Threat', 'Risk Level', 'Measure', 'Resolution', 'Evidence / Accepted By', 'Complete'],
          summary.traceabilityRows.map((r): Cell[] => [
            r.componentLabel, r.threatName, r.riskLevel.toUpperCase(), r.measureTitle,
            r.riskAccepted ? 'Risk Accepted' : 'Measure',
            r.riskAccepted ? (r.acceptedBy ?? '-') : (r.evidenceLink ?? '-'),
            { text: r.complete ? 'Yes' : 'No', color: r.complete ? '#22c55e' : '#ef4444', bold: true, alignment: 'center' },
          ]),
          { fontSize: 7, widths: { 5: 40 } },
        ),
  ];

  const assets: Content[] = [
    ...heading('Asset Register (BSI TR-03183-1)'),
    summary.assets.length === 0
      ? note('No assets defined.')
      : dataTable(
          ['Component', 'Asset Name', 'Category', 'C', 'I', 'A', 'Max Imp.', 'Description'],
          summary.assets.map((a) => {
            const [c, i, av] = [a.confidentiality ?? 1, a.integrity ?? 1, a.availability ?? 1];
            return [a.componentLabel, a.name, a.category, String(c), String(i), String(av), String(Math.max(c, i, av)), a.description ?? '-'];
          }),
          { fontSize: 7.5 },
        ),
  ];

  const allMappings = summary.components.flatMap((c) => (c.data.cra ?? []) as Array<{ requirementId: string; status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable'; notes?: string }>);
  const soaRows = generateStatementOfApplicability([...checklistMappings(craChecklist), ...allMappings]);
  const soa: Content[] = [
    ...heading('CRA Statement of Applicability (BSI TR-03183-H)'),
    dataTable(
      ['ID', 'Title', 'CRA Ref.', 'Applicable', 'Status', 'Justification / Evidence'],
      soaRows.map((r) => [r.requirementId, r.title, r.craRef, r.applicable ? 'Yes' : 'No', r.status, r.justification ?? r.evidence ?? '-']),
      { fontSize: 6.5, widths: { 1: 40, 5: 50 }, padding: 1.5 },
    ),
  ];

  const coverage = { dossier: 'In this dossier', provided: 'Provided', partial: 'Partly' } as Record<string, string>;
  const annex: Content[] = [
    ...heading('CRA Annex VII - Technical Documentation Coverage'),
    { ...note('This dossier covers parts of the technical documentation required by Annex VII. Points marked "supply separately" must be added by the manufacturer.', 8), margin: [0, 0, 0, 8] },
    dataTable(
      ['Point', 'Required content', 'Coverage', 'Where / what to add'],
      (annexVii ?? ANNEX_VII_POINTS.map((p) => ({ point: p, state: p.coverage, detail: p.where }))).map((r) => [r.point.point, r.point.content, coverage[r.state] ?? 'Supply separately', r.detail]),
      { fontSize: 7, widths: { 0: 12, 1: 60, 2: 25 }, padding: 1.5 },
    ),
  ];

  let archCheck: Content[] = [];
  if (modelCheck) {
    const mc = modelCheckTranslations.en;
    const row = (f: Finding, status: string) => [f.ruleId, mc.panel.severity[f.severity], mc.rules[f.ruleId].title(f.params), [...f.craRefs, ...f.iecRefs].join(', '), status];
    archCheck = [
      ...heading('Architecture Check'),
      { ...note('Rule-based check of the architecture model. Open findings are not yet addressed; dismissed findings carry the recorded reason.', 8), margin: [0, 0, 0, 8] },
      modelCheck.open.length === 0 && modelCheck.dismissed.length === 0
        ? note('No findings.', 8)
        : dataTable(
            ['Rule', 'Severity', 'Finding', 'Requirements', 'Status / reason'],
            [...modelCheck.open.map((f) => row(f, 'Open')), ...modelCheck.dismissed.map(({ finding, reason }) => row(finding, `Dismissed: ${reason}`))],
            { fontSize: 7, widths: { 0: 11, 1: 15, 2: 70, 3: 32 }, padding: 1.5 },
          ),
    ];
  }

  const definition = pdfDocument(
    [...cover, ...components, ...threats, ...risks, ...iecSection, ...cra, ...measures, ...traceability, ...assets, ...soa, ...annex, ...archCheck],
    {
      pageMargins: [40, 56, 40, 40],
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#111827' },
      // brand bar with the page number on every page but the cover, which has the large band
      background: (page: number) => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: PAGE_WIDTH, h: page === 1 ? 60 * MM : 12 * MM, color: BRAND }] }),
      header: (page: number, pages: number) => (page === 1 ? null : {
        columns: [{ text: 'CyberRisk Canvas - Risk Assessment Report', width: '*' }, { text: `Page ${page} / ${pages}`, alignment: 'right', width: 'auto' }],
        color: WHITE, fontSize: 8, margin: [28, 12, 28, 0],
      }),
    },
  );
  return downloadPdf(definition, `CRA-${diagramName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
