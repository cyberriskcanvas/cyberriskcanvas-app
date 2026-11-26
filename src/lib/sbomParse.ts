// Pure SBOM helpers (no DB access) so they can be unit-tested and shared by the
// upload route, the CI ingest and the periodic CVE re-scan.

export interface BomHash { alg: string; content: string }

export interface BomComponent {
  name?: string;
  version?: string;
  purl?: string;
  type?: string;
  cpe?: string;
  supplier?: string;
  /** SPDX license ids or expressions as the SBOM states them. */
  licenses?: string[];
  hashes?: BomHash[];
  /** Direct dependency of the product (true) or only pulled in by another component (false); unknown without a dependency graph. */
  direct?: boolean;
}

type Json = Record<string, unknown>;

export interface Bom {
  bomFormat?: string;
  specVersion?: string;
  spdxVersion?: string;
  [key: string]: unknown;
}

export type SbomFormat = 'CycloneDX' | 'SPDX';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.filter((e): e is Json => !!e && typeof e === 'object') : []);
const NO_LICENSE = new Set(['NOASSERTION', 'NONE', '']);

/** Elements of an SPDX 3 document, in the JSON-LD (`@graph`) or the plain (`elements`) form. Null for anything else. */
export function spdx3Items(bom: Bom): Json[] | null {
  if (!JSON.stringify(bom['@context'] ?? '').includes('spdx.org/rdf/3')) return null;
  const items = bom['@graph'] ?? bom.elements;
  return Array.isArray(items) ? list(items) : null;
}

export function detectFormat(bom: Bom): SbomFormat | null {
  if (bom.bomFormat === 'CycloneDX') return 'CycloneDX';
  if (spdx3Items(bom)) return 'SPDX';
  if (typeof bom.spdxVersion === 'string' || bom.packages !== undefined) return 'SPDX';
  return null;
}

/** Drops empty fields so a component only carries what the SBOM actually states. */
function compact(c: BomComponent): BomComponent {
  return Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))) as BomComponent;
}

function cycloneDx(bom: Bom): BomComponent[] {
  const flat: Json[] = [];
  const walk = (cs: unknown) => list(cs).forEach((c) => { flat.push(c); walk(c.components); });
  walk(bom.components);

  // direct = listed under the product itself in the dependency graph
  const root = str((bom.metadata as Json | undefined)?.component && ((bom.metadata as Json).component as Json)['bom-ref']);
  const rootEntry = list(bom.dependencies).find((d) => d.ref === root);
  const directRefs = root && rootEntry ? new Set(Array.isArray(rootEntry.dependsOn) ? rootEntry.dependsOn : []) : null;

  return flat.map((c) => compact({
    name: str(c.name),
    version: str(c.version),
    purl: str(c.purl),
    type: str(c.type),
    cpe: str(c.cpe),
    supplier: str((c.supplier as Json | undefined)?.name),
    licenses: list(c.licenses).map((l) => str((l.license as Json | undefined)?.id) ?? str((l.license as Json | undefined)?.name) ?? str(l.expression)).filter((l): l is string => !!l),
    hashes: list(c.hashes).flatMap((h) => (str(h.alg) && str(h.content) ? [{ alg: str(h.alg)!, content: str(h.content)! }] : [])),
    direct: directRefs && str(c['bom-ref']) ? directRefs.has(c['bom-ref']) : undefined,
  }));
}

function spdx2(bom: Bom): BomComponent[] {
  const pkgs = list(bom.packages);
  const rels = list(bom.relationships);
  const described = new Set([...(Array.isArray(bom.documentDescribes) ? bom.documentDescribes : []), ...rels.filter((r) => r.relationshipType === 'DESCRIBES').map((r) => r.relatedSpdxElement)]);
  const directIds = described.size > 0
    ? new Set(rels.filter((r) => r.relationshipType === 'DEPENDS_ON' && described.has(r.spdxElementId)).map((r) => r.relatedSpdxElement))
    : null;
  return pkgs.map((p) => {
    const refs = list(p.externalRefs);
    const license = [p.licenseConcluded, p.licenseDeclared].map(str).find((l) => l && !NO_LICENSE.has(l));
    return compact({
      name: str(p.name),
      version: str(p.versionInfo),
      purl: str(refs.find((r) => r.referenceType === 'purl')?.referenceLocator),
      cpe: str(refs.find((r) => r.referenceType === 'cpe23Type')?.referenceLocator),
      supplier: str(p.supplier)?.replace(/^(Organization|Person): /, ''),
      licenses: license ? [license] : [],
      hashes: list(p.checksums).flatMap((h) => (str(h.algorithm) && str(h.checksumValue) ? [{ alg: str(h.algorithm)!, content: str(h.checksumValue)! }] : [])),
      direct: directIds && str(p.SPDXID) ? directIds.has(p.SPDXID) : undefined,
    });
  });
}

function spdx3(items: Json[]): BomComponent[] {
  const doc = items.find((e) => e.type === 'SpdxDocument');
  const rootId = str(doc?.rootElement) ?? (Array.isArray(doc?.rootElement) ? str((doc!.rootElement as unknown[])[0]) : undefined);
  const directIds = rootId
    ? new Set(items.filter((r) => r.type === 'Relationship' && r.relationshipType === 'dependsOn' && r.from === rootId).flatMap((r) => (Array.isArray(r.to) ? r.to : [])))
    : null;
  return items
    .filter((e) => e.type === 'software_Package' && (!rootId || e.spdxId !== rootId))
    .map((e) => {
      const purl = str(e.software_packageUrl) ?? str(list(e.externalIdentifiers).find((i) => i.externalIdentifierType === 'packageURL')?.identifier);
      const license = [e.hasConcludedLicense, e.hasDeclaredLicense].map(str).find((l) => l && !NO_LICENSE.has(l));
      return compact({
        name: str(e.name),
        version: str(e.software_packageVersion),
        purl,
        licenses: license ? [license] : [],
        hashes: list(e.verifiedUsing).flatMap((h) => (str(h.algorithm) && str(h.hashValue) ? [{ alg: str(h.algorithm)!, content: str(h.hashValue)! }] : [])),
        direct: directIds && str(e.spdxId) ? directIds.has(e.spdxId) : undefined,
      });
    });
}

/** Extracts a flat component list from CycloneDX, SPDX 2.x or SPDX 3.x. Nameless entries are dropped. */
export function normaliseComponents(bom: Bom): BomComponent[] {
  const items = spdx3Items(bom);
  const list = detectFormat(bom) === 'CycloneDX' ? cycloneDx(bom) : items ? spdx3(items) : spdx2(bom);
  return list.filter((c) => typeof c.name === 'string' && c.name.trim() !== '');
}

/** Identity of a component across SBOMs and products: the purl, else name@version. */
export function componentKey(c: { name: string; version?: string | null; purl?: string | null }): string {
  return c.purl || `${c.name}@${c.version ?? ''}`;
}

/** Only a purl with a version can be matched against advisories; without a version OSV would return every advisory of the package. */
export const isAnalysable = (purl: string | null | undefined): purl is string => !!purl && purl.includes('@');
