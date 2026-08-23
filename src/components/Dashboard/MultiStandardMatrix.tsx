'use client';

import { IEC62443_4_2, IEC62443_3_3 } from '@/data/iec62443';
import { CRA_REQUIREMENTS, DOMAIN_LABELS, type CRADomain } from '@/data/cra';
import type { DiagramSummary } from '@/utils/aggregateDiagram';
import type { IEC62443Mapping, CRAMapping } from '@/types';

// ─── Lookup tables ────────────────────────────────────────────────────────────

const IEC_REQ_TO_CATEGORY: Record<string, string> = {};
for (const req of [...IEC62443_4_2, ...IEC62443_3_3]) {
  IEC_REQ_TO_CATEGORY[req.id] = req.category;
}

const CRA_REQ_TO_DOMAIN: Record<string, CRADomain> = {};
for (const req of CRA_REQUIREMENTS) {
  CRA_REQ_TO_DOMAIN[req.id] = req.domain;
  if (req.legacyId) {
    CRA_REQ_TO_DOMAIN[req.legacyId] = req.domain;
  }
}

const IEC_CATEGORIES = ['IAC', 'UC', 'SI', 'DC', 'RDF', 'TRE', 'RA'] as const;
const IEC_CATEGORY_LABELS: Record<string, string> = {
  IAC: 'Auth',
  UC: 'Use Ctrl',
  SI: 'Integrity',
  DC: 'Confid.',
  RDF: 'Data Flow',
  TRE: 'Events',
  RA: 'Avail.',
};
const IEC_CATEGORY_FULL: Record<string, string> = {
  IAC: 'Identification & Authentication Control',
  UC: 'Use Control',
  SI: 'System Integrity',
  DC: 'Data Confidentiality',
  RDF: 'Restricted Data Flow',
  TRE: 'Timely Response to Events',
  RA: 'Resource Availability',
};

const CRA_DOMAINS_ORDER: CRADomain[] = [
  'cra_part1_properties',
  'cra_part2_vulnerability',
  'user_transparency',
  'technical_documentation',
  'scope_classification',
];

const CRA_DOMAIN_SHORT: Record<string, string> = {
  cra_part1_properties: 'Teil I Eigensch.',
  cra_part2_vulnerability: 'Teil II Schwachst.',
  user_transparency: 'Anhang II Nutzer',
  technical_documentation: 'Anhang VII Doku',
  scope_classification: 'Geltungsbereich',
  scope: 'Scope',
  product_context: 'Product',
  secure_development: 'Sec. Dev',
  risk_assessment: 'Risk',
  vulnerability_handling: 'Vuln.',
  classification: 'Class.',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type CellStatus = 'compliant' | 'partial' | 'non-compliant' | 'empty';

interface CellData {
  status: CellStatus;
  total: number;
  compliant: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeIECCell(mappings: IEC62443Mapping[], category: string): CellData {
  const relevant = mappings.filter(
    (m) => IEC_REQ_TO_CATEGORY[m.requirementId] === category,
  );
  if (relevant.length === 0) return { status: 'empty', total: 0, compliant: 0 };
  const compliant = relevant.filter((m) => m.status === 'compliant').length;
  const nonCompliant = relevant.filter((m) => m.status === 'non-compliant').length;
  let status: CellStatus;
  if (compliant === relevant.length) status = 'compliant';
  else if (nonCompliant === relevant.length) status = 'non-compliant';
  else status = 'partial';
  return { status, total: relevant.length, compliant };
}

function computeCRACell(mappings: CRAMapping[], domain: CRADomain): CellData {
  const relevant = mappings.filter(
    (m) => CRA_REQ_TO_DOMAIN[m.requirementId] === domain,
  );
  if (relevant.length === 0) return { status: 'empty', total: 0, compliant: 0 };
  const compliant = relevant.filter((m) => m.status === 'compliant').length;
  const nonCompliant = relevant.filter((m) => m.status === 'non-compliant').length;
  let status: CellStatus;
  if (compliant === relevant.length) status = 'compliant';
  else if (nonCompliant === relevant.length) status = 'non-compliant';
  else status = 'partial';
  return { status, total: relevant.length, compliant };
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

function MatrixCell({ data, title }: { data: CellData; title: string }) {
  if (data.status === 'empty') {
    return (
      <div className="flex items-center justify-center h-full" title={`${title} - not mapped`}>
        <div className="w-2 h-2 rounded-full bg-gray-200" />
      </div>
    );
  }
  const pct = Math.round((data.compliant / data.total) * 100);
  const dotColor =
    data.status === 'compliant'
      ? 'bg-green-500'
      : data.status === 'partial'
        ? 'bg-yellow-400'
        : 'bg-red-500';
  const textColor =
    data.status === 'compliant'
      ? 'text-green-600'
      : data.status === 'partial'
        ? 'text-yellow-600'
        : 'text-red-500';
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-0.5"
      title={`${title} - ${pct}% compliant (${data.compliant}/${data.total})`}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      <span className={`text-[9px] tabular-nums font-medium ${textColor}`}>{pct}%</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MultiStandardMatrix({ summary }: { summary: DiagramSummary }) {
  const mappedComponents = summary.components.filter(
    (c) => (c.data.iec62443?.length ?? 0) > 0 || (c.data.cra?.length ?? 0) > 0,
  );

  const activeIECCategories = IEC_CATEGORIES.filter((cat) =>
    mappedComponents.some((c) =>
      (c.data.iec62443 ?? []).some((m) => IEC_REQ_TO_CATEGORY[m.requirementId] === cat),
    ),
  );

  const activeCRADomains = CRA_DOMAINS_ORDER.filter((domain) =>
    mappedComponents.some((c) =>
      (c.data.cra ?? []).some((m) => CRA_REQ_TO_DOMAIN[m.requirementId] === domain),
    ),
  );

  return (
    <div className="rounded-xl border border-[#e5e1d8] bg-white overflow-hidden">
      <div className="border-b border-[#e5e1d8] px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-[#1a1917]">Multi-Standard Compliance Matrix</h2>
          <p className="text-[11px] text-[#6b6460] mt-0.5">
            IEC 62443 × EU CRA - per component, per category/domain
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#9b9590] shrink-0">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Compliant
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
            Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Non-compliant
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
            Not mapped
          </span>
        </div>
      </div>

      {mappedComponents.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-[#9b9590]">
          Map IEC 62443 or EU CRA requirements to components to see the compliance matrix.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              {/* Standard group header */}
              <tr className="bg-[#faf9f7]">
                <th
                  className="sticky left-0 z-10 bg-[#faf9f7] border-b border-[#e5e1d8]"
                  style={{ minWidth: 160 }}
                />
                {activeIECCategories.length > 0 && (
                  <th
                    colSpan={activeIECCategories.length}
                    className="text-center px-2 py-1.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border-b border-[#e5e1d8] border-l border-blue-200"
                  >
                    IEC 62443
                  </th>
                )}
                {activeCRADomains.length > 0 && (
                  <th
                    colSpan={activeCRADomains.length}
                    className="text-center px-2 py-1.5 text-[10px] font-semibold text-purple-700 bg-purple-50 border-b border-[#e5e1d8] border-l border-purple-200"
                  >
                    EU CRA
                  </th>
                )}
              </tr>
              {/* Category/domain sub-header */}
              <tr className="bg-[#faf9f7] border-b border-[#e5e1d8]">
                <th
                  className="sticky left-0 z-10 bg-[#faf9f7] px-4 py-2 text-left text-[11px] font-semibold text-[#6b6460]"
                  style={{ minWidth: 160 }}
                >
                  Component
                </th>
                {activeIECCategories.map((cat, i) => (
                  <th
                    key={cat}
                    className="w-14 text-center py-2 text-[10px] font-medium text-blue-800"
                    style={i === 0 ? { borderLeft: '1px solid #bfdbfe' } : {}}
                    title={IEC_CATEGORY_FULL[cat]}
                  >
                    {IEC_CATEGORY_LABELS[cat]}
                  </th>
                ))}
                {activeCRADomains.map((domain, i) => (
                  <th
                    key={domain}
                    className="w-14 text-center py-2 text-[10px] font-medium text-purple-800"
                    style={i === 0 ? { borderLeft: '1px solid #e9d5ff' } : {}}
                    title={DOMAIN_LABELS[domain]}
                  >
                    {CRA_DOMAIN_SHORT[domain]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappedComponents.map((component, rowIdx) => {
                const iec = component.data.iec62443 ?? [];
                const cra = component.data.cra ?? [];
                const isEven = rowIdx % 2 === 0;
                const rowBg = isEven ? 'bg-white' : 'bg-[#faf9f7]/50';
                return (
                  <tr key={component.id} className={`border-b border-[#e5e1d8]/60 ${rowBg}`}>
                    <td
                      className={`sticky left-0 z-10 ${rowBg} px-4 py-2.5`}
                      style={{ minWidth: 160 }}
                    >
                      <p
                        className="font-medium text-[#1a1917] truncate"
                        style={{ maxWidth: 148 }}
                        title={component.data.label}
                      >
                        {component.data.label || 'Unnamed'}
                      </p>
                      <p className="text-[10px] text-[#9b9590] mt-0.5">{component.type}</p>
                    </td>
                    {activeIECCategories.map((cat, i) => {
                      const cell = computeIECCell(iec, cat);
                      return (
                        <td
                          key={cat}
                          className="w-14 py-2.5"
                          style={i === 0 ? { borderLeft: '1px solid #bfdbfe' } : {}}
                        >
                          <MatrixCell
                            data={cell}
                            title={`${component.data.label} / ${IEC_CATEGORY_FULL[cat]}`}
                          />
                        </td>
                      );
                    })}
                    {activeCRADomains.map((domain, i) => {
                      const cell = computeCRACell(cra, domain);
                      return (
                        <td
                          key={domain}
                          className="w-14 py-2.5"
                          style={i === 0 ? { borderLeft: '1px solid #e9d5ff' } : {}}
                        >
                          <MatrixCell
                            data={cell}
                            title={`${component.data.label} / ${DOMAIN_LABELS[domain]}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
