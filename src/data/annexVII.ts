/**
 * CRA Annex VII (content of the technical documentation, Regulation (EU) 2024/2847,
 * OJ L of 20.11.2024): which point the CyberRisk Canvas dossier covers and what the
 * manufacturer has to supply separately. Shown as the last page of the PDF dossier so the
 * dossier never claims more than it contains. Point texts are own short summaries.
 */
export type AnnexVIICoverage = 'dossier' | 'partial' | 'separate';

export interface AnnexVIIPoint {
  point: string;
  content: string;
  coverage: AnnexVIICoverage;
  where: string;
}

export const ANNEX_VII_POINTS: AnnexVIIPoint[] = [
  { point: '1(a)', content: 'Intended purpose of the product', coverage: 'separate', where: 'Product description (project description can be reused)' },
  { point: '1(b)', content: 'Software versions affecting compliance', coverage: 'partial', where: 'Project version on the cover; component versions in section 1 and the SBOM export' },
  { point: '1(c)', content: 'Hardware: photos/illustrations of external features, marking, internal layout', coverage: 'separate', where: 'Supply separately' },
  { point: '1(d)', content: 'User information and instructions (Annex II)', coverage: 'separate', where: 'User documentation; tracked as CRA requirements UT.1-UT.5' },
  { point: '2(a)', content: 'Design and development, system architecture', coverage: 'dossier', where: 'Section 1 (components) and the architecture model in CyberRisk Canvas' },
  { point: '2(b)', content: 'Vulnerability handling: SBOM, CVD policy, contact address, secure update distribution', coverage: 'partial', where: 'SBOM export (BSI TR-03183-2), CSAF/VEX export, security.txt/CVD generator; describe the update distribution separately' },
  { point: '2(c)', content: 'Production and monitoring processes and their validation', coverage: 'separate', where: 'Supply separately' },
  { point: '3', content: 'Cybersecurity risk assessment, incl. applicability of Annex I Part I', coverage: 'dossier', where: 'Sections 2-3 (threats, risks), 5 (CRA), 7 (traceability), 9 (SoA)' },
  { point: '4', content: 'Information used to determine the support period', coverage: 'separate', where: 'Supply separately (CRA requirement UT.4)' },
  { point: '5', content: 'Harmonised standards, common specifications or certification schemes applied', coverage: 'partial', where: 'Section 4 (IEC 62443 mapping); add the list of applied standards and their parts' },
  { point: '6', content: 'Reports of conformity tests (product and vulnerability handling)', coverage: 'partial', where: 'Security test status per component and CI runs in CyberRisk Canvas; attach the test reports' },
  { point: '7', content: 'Copy of the EU declaration of conformity', coverage: 'separate', where: 'Supply separately (CRA requirement UT.5)' },
  { point: '8', content: 'SBOM on reasoned request of a market surveillance authority', coverage: 'dossier', where: 'SBOM export (BSI TR-03183-2) per version' },
];
