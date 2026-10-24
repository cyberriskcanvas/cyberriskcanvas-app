// Data for the generated documents (Annex II user information, Annex V declaration of conformity,
// Annex VII entries). Free text typed by the team; everything is capped and whitelisted.

export const INSTRUCTION_KEYS = ['commissioning', 'dataImpact', 'updates', 'decommissioning', 'autoUpdateOff', 'integration'] as const;
export type InstructionKey = (typeof INSTRUCTION_KEYS)[number];

/** Annex VII points that need an entry from the team (the dossier covers the others itself). */
export const ANNEX_VII_KEYS = ['1a', '1b', '1c', '1d', '2b', '2c', '4', '5', '6', '7'] as const;
export type AnnexViiKey = (typeof ANNEX_VII_KEYS)[number];

export interface AnnexViiEntry { note?: string; documentId?: string; documentName?: string }

export interface DocData {
  manufacturer: { name: string; address: string; email: string; website: string };
  product: { name: string; type: string; identification: string };
  securityEnvironment: string;
  knownRisks: string;
  supportType: string;
  instructions: Record<InstructionKey, string>;
  sbomLocation: string;
  cvdUrl: string;
  declarationUrl: string;
  standards: string;
  notifiedBody: { name: string; number: string; certificate: string };
  annexVII: Partial<Record<AnnexViiKey, AnnexViiEntry>>;
}

const MAX = 4000;
const str = (v: unknown, max = MAX): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function emptyDocData(): DocData {
  return sanitizeDocData({});
}

/** Whitelists and caps all fields; unknown keys are dropped. */
export function sanitizeDocData(raw: unknown): DocData {
  const r = obj(raw);
  const m = obj(r.manufacturer);
  const p = obj(r.product);
  const nb = obj(r.notifiedBody);
  const ins = obj(r.instructions);
  const vii = obj(r.annexVII);

  const annexVII: DocData['annexVII'] = {};
  for (const key of ANNEX_VII_KEYS) {
    const e = obj(vii[key]);
    const entry: AnnexViiEntry = {};
    if (str(e.note)) entry.note = str(e.note);
    if (str(e.documentId, 64)) { entry.documentId = str(e.documentId, 64); entry.documentName = str(e.documentName, 255); }
    if (entry.note || entry.documentId) annexVII[key] = entry;
  }

  return {
    manufacturer: { name: str(m.name, 256), address: str(m.address, 512), email: str(m.email, 256), website: str(m.website, 512) },
    product: { name: str(p.name, 256), type: str(p.type, 256), identification: str(p.identification, 512) },
    securityEnvironment: str(r.securityEnvironment),
    knownRisks: str(r.knownRisks),
    supportType: str(r.supportType),
    instructions: Object.fromEntries(INSTRUCTION_KEYS.map((k) => [k, str(ins[k])])) as Record<InstructionKey, string>,
    sbomLocation: str(r.sbomLocation, 512),
    cvdUrl: str(r.cvdUrl, 512),
    declarationUrl: str(r.declarationUrl, 512),
    standards: str(r.standards),
    notifiedBody: { name: str(nb.name, 256), number: str(nb.number, 64), certificate: str(nb.certificate, 256) },
    annexVII,
  };
}
