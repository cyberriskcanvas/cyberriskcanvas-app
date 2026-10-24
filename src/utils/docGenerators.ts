// Generators for the documents the CRA asks the manufacturer to provide. Own wording, following
// the structure of Annex II (information and instructions to the user) and Annex V (EU declaration
// of conformity) of Regulation (EU) 2024/2847. Pure: no I/O, so the texts can be tested.
import { ANNEX_VII_POINTS, type AnnexVIIPoint } from '@/data/annexVII';
import type { AnnexViiKey, DocData, InstructionKey } from '@/lib/docData';

export type DocLang = 'de' | 'en';

export interface ProductFacts {
  productName: string;
  version: string | null;
  intendedPurpose: string | null;
  supportPeriodEnd: string | null; // ISO
  supportPeriodRationale: string | null;
  /** Contact details for vulnerability reports (CSAF publisher profile), if set. */
  vulnerabilityContact: string | null;
  craClass: string | null;
}

export interface GeneratedDoc {
  title: string;
  /** Markdown text. Open points are marked "[TODO: …]". */
  markdown: string;
  /** Codes of required information that is still missing. */
  missing: string[];
}

const LABEL: Record<DocLang, Record<string, string>> = {
  de: {
    manufacturer_name: 'Name des Herstellers', manufacturer_address: 'Postanschrift des Herstellers', manufacturer_email: 'E-Mail oder digitaler Kontakt',
    product_name: 'Produktname', product_type: 'Produkttyp', product_identification: 'Version, Charge oder Seriennummer',
    contact_point: 'Kontaktstelle für Schwachstellenmeldungen', purpose: 'Bestimmungsgemäßer Zweck', environment: 'Sicherheitsumgebung', risks: 'Bekannte oder vorhersehbare Risiken',
    support_end: 'Ende des Supportzeitraums', support_type: 'Art der Sicherheitsunterstützung',
    commissioning: 'Anleitung: Inbetriebnahme und sichere Nutzung', dataImpact: 'Anleitung: Auswirkungen von Änderungen auf die Datensicherheit', updates: 'Anleitung: Installation von Sicherheitsupdates',
    decommissioning: 'Anleitung: Außerbetriebnahme und Datenlöschung', autoUpdateOff: 'Anleitung: Automatische Updates abschalten',
    standards: 'Angewandte Normen oder Spezifikationen', declaration_url: 'Internetadresse der Konformitätserklärung',
  },
  en: {
    manufacturer_name: 'Manufacturer name', manufacturer_address: 'Manufacturer postal address', manufacturer_email: 'Email or other digital contact',
    product_name: 'Product name', product_type: 'Product type', product_identification: 'Version, batch or serial number',
    contact_point: 'Contact point for vulnerability reports', purpose: 'Intended purpose', environment: 'Security environment', risks: 'Known or foreseeable risks',
    support_end: 'End of the support period', support_type: 'Type of security support',
    commissioning: 'Instructions: commissioning and secure use', dataImpact: 'Instructions: effect of changes on data security', updates: 'Instructions: installing security updates',
    decommissioning: 'Instructions: decommissioning and data removal', autoUpdateOff: 'Instructions: turning off automatic updates',
    standards: 'Applied standards or specifications', declaration_url: 'Internet address of the declaration of conformity',
  },
};
export const missingLabel = (lang: DocLang, code: string) => LABEL[lang][code] ?? code;

const fmtDate = (iso: string | null, lang: DocLang) => (iso ? new Date(iso).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '');

// ── Annex II ──────────────────────────────────────────────────────────────────

const A2 = {
  de: {
    title: (p: string) => `${p}: Informationen und Anleitungen für Nutzer`,
    note: 'Entwurf nach Anhang II der Verordnung (EU) 2024/2847. Prüfen Sie jeden Abschnitt, ergänzen Sie die markierten Stellen und stellen Sie das Dokument zusammen mit dem Produkt bereit.',
    todo: (what: string) => `[TODO: ${what}]`,
    s1: 'Hersteller', s2: 'Meldung von Schwachstellen', s3: 'Produktidentifikation', s4: 'Bestimmungsgemäßer Zweck und Sicherheitsumgebung',
    s5: 'Bekannte oder vorhersehbare Risiken', s6: 'EU-Konformitätserklärung', s7: 'Sicherheitsunterstützung', s8: 'Anleitungen zur sicheren Nutzung', s9: 'Software-Stückliste (SBOM)',
    address: 'Anschrift', email: 'E-Mail', website: 'Website', name: 'Name', type: 'Typ', identification: 'Kennung',
    contact: 'Schwachstellen und Sicherheitslücken melden Sie hier', cvd: 'Unsere Richtlinie zur koordinierten Offenlegung finden Sie hier',
    purpose: 'Zweck', environment: 'Vorgesehene Sicherheitsumgebung, wesentliche Funktionen und Sicherheitseigenschaften',
    declaration: 'Die EU-Konformitätserklärung ist hier abrufbar', sbom: 'Die SBOM ist hier abrufbar',
    supportEnd: 'Sicherheitsupdates erhalten Sie mindestens bis', supportType: 'Art der Unterstützung',
    a: 'a) Inbetriebnahme und sichere Nutzung während der gesamten Lebensdauer', b: 'b) Auswirkungen von Änderungen am Produkt auf die Datensicherheit',
    c: 'c) Installation sicherheitsrelevanter Updates', d: 'd) Sichere Außerbetriebnahme, einschließlich Entfernen von Nutzerdaten',
    e: 'e) Automatische Installation von Sicherheitsupdates abschalten', f: 'f) Hinweise für Integratoren (Einbau in andere Produkte)',
  },
  en: {
    title: (p: string) => `${p}: Information and instructions for users`,
    note: 'Draft based on Annex II of Regulation (EU) 2024/2847. Review every section, fill in the marked places and provide the document together with the product.',
    todo: (what: string) => `[TODO: ${what}]`,
    s1: 'Manufacturer', s2: 'Reporting vulnerabilities', s3: 'Product identification', s4: 'Intended purpose and security environment',
    s5: 'Known or foreseeable risks', s6: 'EU declaration of conformity', s7: 'Security support', s8: 'Instructions for secure use', s9: 'Software bill of materials (SBOM)',
    address: 'Address', email: 'Email', website: 'Website', name: 'Name', type: 'Type', identification: 'Identification',
    contact: 'Report vulnerabilities and security issues here', cvd: 'Our coordinated vulnerability disclosure policy is available here',
    purpose: 'Purpose', environment: 'Intended security environment, essential functions and security properties',
    declaration: 'The EU declaration of conformity can be accessed here', sbom: 'The SBOM can be accessed here',
    supportEnd: 'You receive security updates at least until', supportType: 'Type of support',
    a: 'a) Commissioning and secure use throughout the lifetime', b: 'b) How changes to the product can affect the security of data',
    c: 'c) How security-relevant updates can be installed', d: 'd) Secure decommissioning, including removing user data',
    e: 'e) Turning off the automatic installation of security updates', f: 'f) Information for integrators (integration into other products)',
  },
} as const;

export function generateAnnexII(data: DocData, facts: ProductFacts, lang: DocLang): GeneratedDoc {
  const t = A2[lang];
  const missing: string[] = [];
  const need = (code: string, value: string | null | undefined): string => {
    if (value && value.trim()) return value.trim();
    missing.push(code);
    return t.todo(missingLabel(lang, code));
  };

  const productName = data.product.name || facts.productName;
  const contact = data.manufacturer.email || facts.vulnerabilityContact || '';
  const lines: string[] = [`# ${t.title(productName)}`, '', `> ${t.note}`, ''];

  lines.push(`## 1. ${t.s1}`, '',
    `- ${t.name}: ${need('manufacturer_name', data.manufacturer.name)}`,
    `- ${t.address}: ${need('manufacturer_address', data.manufacturer.address)}`,
    `- ${t.email}: ${need('manufacturer_email', data.manufacturer.email)}`,
    ...(data.manufacturer.website ? [`- ${t.website}: ${data.manufacturer.website}`] : []), '');

  lines.push(`## 2. ${t.s2}`, '', `${t.contact}: ${need('contact_point', facts.vulnerabilityContact || contact)}`,
    ...(data.cvdUrl ? ['', `${t.cvd}: ${data.cvdUrl}`] : []), '');

  lines.push(`## 3. ${t.s3}`, '',
    `- ${t.name}: ${productName}`,
    `- ${t.type}: ${need('product_type', data.product.type)}`,
    `- ${t.identification}: ${need('product_identification', data.product.identification || facts.version)}`, '');

  lines.push(`## 4. ${t.s4}`, '',
    `**${t.purpose}.** ${need('purpose', facts.intendedPurpose)}`, '',
    `**${t.environment}.** ${need('environment', data.securityEnvironment)}`, '');

  lines.push(`## 5. ${t.s5}`, '', need('risks', data.knownRisks), '');

  if (data.declarationUrl) lines.push(`## 6. ${t.s6}`, '', `${t.declaration}: ${data.declarationUrl}`, '');

  lines.push(`## 7. ${t.s7}`, '',
    `- ${t.supportType}: ${need('support_type', data.supportType)}`,
    `- ${t.supportEnd}: ${facts.supportPeriodEnd ? fmtDate(facts.supportPeriodEnd, lang) : need('support_end', null)}`, '');

  const instruction = (key: InstructionKey, label: string, required: boolean) => {
    const v = data.instructions[key];
    if (!v && !required) return [];
    return [`### ${label}`, '', required ? need(key, v) : v, ''];
  };
  lines.push(`## 8. ${t.s8}`, '',
    ...instruction('commissioning', t.a, true), ...instruction('dataImpact', t.b, true), ...instruction('updates', t.c, true),
    ...instruction('decommissioning', t.d, true), ...instruction('autoUpdateOff', t.e, true), ...instruction('integration', t.f, false));

  if (data.sbomLocation) lines.push(`## 9. ${t.s9}`, '', `${t.sbom}: ${data.sbomLocation}`, '');

  return { title: t.title(productName), markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', missing };
}

// ── Annex V: EU declaration of conformity ─────────────────────────────────────

const A5 = {
  de: {
    title: 'EU-Konformitätserklärung (Entwurf)',
    draft: 'Entwurf: Die Erklärung gilt erst, wenn sie vom Hersteller geprüft und unterzeichnet wurde. Sie ist ein Hilfsmittel und ersetzt keine rechtliche Prüfung.',
    rows: ['1. Name, Typ und Kennung des Produkts', '2. Name und Anschrift des Herstellers', '4. Gegenstand der Erklärung', '6. Angewandte harmonisierte Normen, Spezifikationen oder Zertifizierung', '7. Benannte Stelle'],
    sole: 'Diese Konformitätserklärung wird in alleiniger Verantwortung des Herstellers ausgestellt.',
    conformity: (p: string) => `Der oben beschriebene Gegenstand der Erklärung (${p}) erfüllt die einschlägigen Harmonisierungsrechtsvorschriften der Union, insbesondere die Verordnung (EU) 2024/2847 (Cyberresilienz-Verordnung).`,
    none: 'Keine angegeben.', notApplicable: 'Nicht zutreffend.',
    nb: (n: string, no: string, c: string) => `Benannte Stelle: ${n}${no ? ` (Nr. ${no})` : ''}${c ? `, Bescheinigung: ${c}` : ''}`,
    place: 'Ort, Datum', signature: 'Name, Funktion, Unterschrift', simplified: 'Vereinfachte Konformitätserklärung (Anhang VI)',
    simplifiedText: (m: string, p: string) => `Hiermit erklärt ${m}, dass das Produkt mit digitalen Elementen ${p} der Verordnung (EU) 2024/2847 entspricht.`,
    fullText: (u: string) => `Der vollständige Text der EU-Konformitätserklärung ist unter folgender Internetadresse verfügbar: ${u}`,
  },
  en: {
    title: 'EU declaration of conformity (draft)',
    draft: 'Draft: the declaration only applies once the manufacturer has checked and signed it. It is an aid and does not replace a legal review.',
    rows: ['1. Name, type and identification of the product', '2. Name and address of the manufacturer', '4. Object of the declaration', '6. Applied harmonised standards, specifications or certification', '7. Notified body'],
    sole: 'This declaration of conformity is issued under the sole responsibility of the manufacturer.',
    conformity: (p: string) => `The object of the declaration described above (${p}) is in conformity with the relevant Union harmonisation legislation, in particular Regulation (EU) 2024/2847 (Cyber Resilience Act).`,
    none: 'None stated.', notApplicable: 'Not applicable.',
    nb: (n: string, no: string, c: string) => `Notified body: ${n}${no ? ` (No. ${no})` : ''}${c ? `, certificate: ${c}` : ''}`,
    place: 'Place and date of issue', signature: 'Name, function, signature', simplified: 'Simplified EU declaration of conformity (Annex VI)',
    simplifiedText: (m: string, p: string) => `Hereby, ${m} declares that the product with digital elements ${p} is in compliance with Regulation (EU) 2024/2847.`,
    fullText: (u: string) => `The full text of the EU declaration of conformity is available at the following internet address: ${u}`,
  },
} as const;

export interface DeclarationDoc {
  title: string;
  draftNote: string;
  rows: Array<[string, string]>;
  statements: string[];
  signature: { place: string; signer: string };
  simplified: { heading: string; text: string; full: string | null };
  missing: string[];
}

export function generateDeclaration(data: DocData, facts: ProductFacts, lang: DocLang): DeclarationDoc {
  const t = A5[lang];
  const missing: string[] = [];
  const need = (code: string, value: string) => {
    if (value.trim()) return value.trim();
    missing.push(code);
    return `[${missingLabel(lang, code)}]`;
  };
  const product = data.product.name || facts.productName;
  const manufacturerName = need('manufacturer_name', data.manufacturer.name);
  const identification = [product, need('product_type', data.product.type), need('product_identification', data.product.identification || facts.version || '')].join(', ');
  const hasNb = !!data.notifiedBody.name;

  return {
    title: t.title,
    draftNote: t.draft,
    rows: [
      [t.rows[0], identification],
      [t.rows[1], `${manufacturerName}, ${need('manufacturer_address', data.manufacturer.address)}`],
      [t.rows[2], identification],
      [t.rows[3], data.standards.trim() || t.none],
      [t.rows[4], hasNb ? t.nb(data.notifiedBody.name, data.notifiedBody.number, data.notifiedBody.certificate) : t.notApplicable],
    ],
    statements: [t.sole, t.conformity(product)],
    signature: { place: t.place, signer: t.signature },
    simplified: { heading: t.simplified, text: t.simplifiedText(manufacturerName, product), full: data.declarationUrl ? t.fullText(data.declarationUrl) : null },
    missing,
  };
}

// ── Annex VII coverage ────────────────────────────────────────────────────────

export type AnnexViiState = 'dossier' | 'provided' | 'partial' | 'separate';
export interface AnnexViiRow { point: AnnexVIIPoint; state: AnnexViiState; detail: string }

/** Which Annex VII points are covered, taking the team's entries into account. */
export function annexViiCoverage(data: DocData, facts: ProductFacts, annexIIComplete: boolean, declarationComplete: boolean): AnnexViiRow[] {
  const entryOf = (key: string) => data.annexVII[key as AnnexViiKey];
  return ANNEX_VII_POINTS.map((point): AnnexViiRow => {
    const key = point.point.replace(/[()]/g, ''); // "1(a)" -> "1a", the key used in DocData
    const e = entryOf(key);
    if (e?.documentId) return { point, state: 'provided', detail: e.documentName ? `Attached: ${e.documentName}` : 'Attached document' };
    if (e?.note) return { point, state: 'provided', detail: e.note.length > 120 ? `${e.note.slice(0, 117)}…` : e.note };
    if (key === '1a' && facts.intendedPurpose?.trim()) return { point, state: 'provided', detail: 'Intended purpose in the product data' };
    if (key === '4' && facts.supportPeriodRationale?.trim()) return { point, state: 'provided', detail: 'Support period and rationale in the product data' };
    if (key === '1d' && annexIIComplete) return { point, state: 'provided', detail: 'Annex II document generated' };
    if (key === '7' && declarationComplete) return { point, state: 'provided', detail: 'Declaration of conformity prepared' };
    return { point, state: point.coverage === 'separate' ? 'separate' : point.coverage, detail: point.where };
  });
}
