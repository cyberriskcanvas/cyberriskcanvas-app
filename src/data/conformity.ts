/**
 * CRA conformity assessment procedure per product class (Regulation (EU) 2024/2847, Art. 32,
 * checked against the Official Journal text of 20.11.2024). Own short wording.
 */
export type CraClass = 'default' | 'class-i' | 'class-ii' | 'critical';
export const CRA_CLASSES: readonly CraClass[] = ['default', 'class-i', 'class-ii', 'critical'];

export interface ConformityPath {
  /** Procedures that may be used: A internal control, B+C EU-type examination, H full quality assurance, EUCS certification scheme. */
  procedures: Array<'A' | 'B+C' | 'H' | 'EUCS'>;
  /** Whether a notified body (or certification body) is involved. */
  notifiedBody: 'no' | 'unless-standards' | 'yes';
  note: { de: string; en: string };
}

const PATHS: Record<CraClass, ConformityPath> = {
  default: {
    procedures: ['A', 'B+C', 'H', 'EUCS'],
    notifiedBody: 'no',
    note: {
      de: 'Selbstbewertung nach Modul A (interne Kontrolle) genügt. Sie erstellen die technische Dokumentation und die EU-Konformitätserklärung selbst (Art. 32(1)).',
      en: 'Self-assessment under module A (internal control) is sufficient. You draw up the technical documentation and the EU declaration of conformity yourself (Art. 32(1)).',
    },
  },
  'class-i': {
    procedures: ['A', 'B+C', 'H', 'EUCS'],
    notifiedBody: 'unless-standards',
    note: {
      de: 'Modul A nur, wenn Sie harmonisierte Normen, gemeinsame Spezifikationen oder ein EU-Zertifizierungsschema (mindestens „substanziell") vollständig anwenden. Sonst ist Modul B+C oder H mit einer benannten Stelle nötig (Art. 32(2)).',
      en: 'Module A only if you fully apply harmonised standards, common specifications or an EU certification scheme (at least "substantial"). Otherwise module B+C or H with a notified body is required (Art. 32(2)).',
    },
  },
  'class-ii': {
    procedures: ['B+C', 'H', 'EUCS'],
    notifiedBody: 'yes',
    note: {
      de: 'Keine reine Selbstbewertung: Modul B+C oder H mit einer benannten Stelle, oder ein EU-Zertifizierungsschema mindestens auf Stufe „substanziell" (Art. 32(3)).',
      en: 'No self-assessment only: module B+C or H with a notified body, or an EU certification scheme at assurance level at least "substantial" (Art. 32(3)).',
    },
  },
  critical: {
    procedures: ['EUCS', 'B+C', 'H'],
    notifiedBody: 'yes',
    note: {
      de: 'Europäische Cybersicherheitszertifizierung, soweit nach Art. 8(1) vorgeschrieben, sonst wie Klasse II (Art. 32(4)).',
      en: 'European cybersecurity certification where required under Art. 8(1), otherwise as class II (Art. 32(4)).',
    },
  },
};

export function conformityPath(craClass: CraClass): ConformityPath {
  return PATHS[craClass];
}

export function isCraClass(v: unknown): v is CraClass {
  return (CRA_CLASSES as readonly unknown[]).includes(v);
}
