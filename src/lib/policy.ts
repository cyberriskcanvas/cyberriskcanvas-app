import { LICENSE_GROUPS } from '@/data/licenseGroups';
import { severityRank } from './cvss';
import { isAnalysable } from './sbomParse';
import { UNRESOLVED } from './findingStatus';
import type { Finding } from './findings';

// Policy engine: rules over the components and findings of a version. Pure; nothing is stored here,
// a violation is recomputed from the current data, so fixing the cause removes it.

export const POLICY_SUBJECTS = ['license', 'license_group', 'license_missing', 'purl', 'no_purl', 'severity', 'epss', 'kev', 'cwe'] as const;
export type PolicySubject = (typeof POLICY_SUBJECTS)[number];
export const VIOLATION_LEVELS = ['fail', 'warn', 'info'] as const;
export type ViolationLevel = (typeof VIOLATION_LEVELS)[number];

/**
 * value by subject:
 * license: SPDX ids; license_group: strong-copyleft | weak-copyleft | permissive; purl: pattern with * (pkg:npm/lodash@4.17.*);
 * severity: CRITICAL | HIGH | MEDIUM | LOW (from there on); epss: 0..1 (from there on); cwe: CWE ids; the rest take no value.
 */
export interface PolicyCondition { subject: PolicySubject; value?: string }

export interface Policy {
  id: string;
  name: string;
  violation: ViolationLevel;
  operator: 'any' | 'all';
  conditions: PolicyCondition[];
  /** Empty = every product. */
  projectIds: string[];
}

export interface PolicyComponent {
  projectId: string;
  versionId: string;
  key: string;
  name: string;
  version: string | null;
  purl: string | null;
  licenses: string[];
}

export interface Violation {
  policyId: string;
  policyName: string;
  level: ViolationLevel;
  projectId: string;
  versionId: string;
  componentKey: string;
  componentName: string;
  componentVersion: string | null;
  reasons: string[];
  /** Accepted by the product team for this component. */
  waived: boolean;
}

const norm = (s: string) => s.trim().toLowerCase();
const words = (v?: string) => (v ?? '').split(/[\s,]+/).map(norm).filter(Boolean);
const NO_LICENSE = new Set(['noassertion', 'none']);
const FINDING_SUBJECTS: ReadonlySet<PolicySubject> = new Set(['severity', 'epss', 'kev', 'cwe']);

/**
 * Whether the license expression cannot be satisfied without a license for which `bad` holds.
 * ponytail: parentheses are ignored and WITH exceptions dropped; a real SPDX parser when this misjudges a real expression.
 */
export function mustUse(expression: string, bad: (id: string) => boolean): boolean {
  return expression.replace(/[()]/g, ' ').split(/\s+OR\s+/i).every((alt) =>
    alt.split(/\s+AND\s+/i).some((term) => bad(norm(term.split(/\s+WITH\s+/i)[0]))),
  );
}

function componentHit(c: PolicyComponent, { subject, value }: PolicyCondition): string | null {
  switch (subject) {
    case 'license': {
      const ids = new Set(words(value));
      const hit = c.licenses.find((l) => mustUse(l, (id) => ids.has(id)));
      return hit ? `license ${hit}` : null;
    }
    case 'license_group': {
      const group = (LICENSE_GROUPS as Record<string, readonly string[]>)[value ?? ''];
      const ids = new Set((group ?? []).map(norm));
      const hit = c.licenses.find((l) => mustUse(l, (id) => ids.has(id)));
      return hit ? `license ${hit} (${value})` : null;
    }
    case 'license_missing':
      return c.licenses.every((l) => NO_LICENSE.has(norm(l))) ? 'no license stated' : null;
    case 'purl': {
      if (!c.purl || !value) return null;
      const re = new RegExp(`^${value.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
      return re.test(c.purl) ? `component ${c.purl}` : null;
    }
    case 'no_purl':
      return isAnalysable(c.purl) ? null : 'no package URL with a version: cannot be checked for vulnerabilities';
    default:
      return null;
  }
}

function findingHit(f: Finding, { subject, value }: PolicyCondition): boolean {
  switch (subject) {
    case 'severity': return severityRank(f.severity) >= Math.max(1, severityRank(value));
    case 'epss': return f.epss !== null && f.epss >= Number(value);
    case 'kev': return f.kevAddedAt !== null;
    case 'cwe': {
      const ids = new Set(words(value).map((w) => (w.startsWith('cwe-') ? w : `cwe-${w}`)));
      return f.cwes.some((c) => ids.has(norm(c)));
    }
    default: return false;
  }
}

const describe = (f: Finding) => `${f.osvId} (${f.severity ?? 'unrated'}${f.kevAddedAt ? ', actively exploited' : ''})`;

/** waivers: "policyId|projectId|componentKey". Only unresolved, unsuppressed findings count. */
export function evaluatePolicies(policies: Policy[], components: PolicyComponent[], findings: Finding[], waivers: ReadonlySet<string> = new Set()): Violation[] {
  const open = new Map<string, Finding[]>();
  for (const f of findings) {
    if (f.suppressed || !UNRESOLVED.includes(f.status)) continue;
    const k = `${f.versionId}\u0000${f.componentKey}`;
    open.set(k, [...(open.get(k) ?? []), f]);
  }

  const out: Violation[] = [];
  for (const p of policies) {
    const compConds = p.conditions.filter((c) => !FINDING_SUBJECTS.has(c.subject));
    const findConds = p.conditions.filter((c) => FINDING_SUBJECTS.has(c.subject));
    if (p.conditions.length === 0) continue;
    for (const c of components) {
      if (p.projectIds.length > 0 && !p.projectIds.includes(c.projectId)) continue;
      const compReasons = compConds.map((cond) => componentHit(c, cond)).filter((r): r is string => r !== null);
      // one finding has to satisfy all finding conditions (operator all) or any of them (any)
      const hits = findConds.length === 0 ? [] : (open.get(`${c.versionId}\u0000${c.key}`) ?? []).filter((f) => (p.operator === 'all' ? findConds.every((x) => findingHit(f, x)) : findConds.some((x) => findingHit(f, x))));
      const violated = p.operator === 'all'
        ? compReasons.length === compConds.length && (findConds.length === 0 || hits.length > 0)
        : compReasons.length > 0 || hits.length > 0;
      if (!violated) continue;
      out.push({
        policyId: p.id, policyName: p.name, level: p.violation,
        projectId: c.projectId, versionId: c.versionId, componentKey: c.key, componentName: c.name, componentVersion: c.version,
        reasons: [...compReasons, ...hits.slice(0, 3).map(describe)],
        waived: waivers.has(`${p.id}|${c.projectId}|${c.key}`),
      });
    }
  }
  return out;
}

export interface PolicyInput { name: string; violation: ViolationLevel; operator: 'any' | 'all'; conditions: PolicyCondition[]; projectIds: string[] }

const NEEDS_VALUE: ReadonlySet<PolicySubject> = new Set(['license', 'license_group', 'purl', 'severity', 'epss', 'cwe']);

/** Returns the cleaned input, or the first problem as a message. */
export function validatePolicy(raw: Record<string, unknown>): { ok: true; value: PolicyInput } | { ok: false; error: string } {
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 120) : '';
  if (!name) return { ok: false, error: 'A policy needs a name.' };
  const violation = VIOLATION_LEVELS.find((l) => l === raw.violation) ?? 'fail';
  const operator = raw.operator === 'all' ? 'all' : 'any';
  const conditions: PolicyCondition[] = [];
  for (const c of (Array.isArray(raw.conditions) ? raw.conditions : []).slice(0, 20)) {
    const subject = POLICY_SUBJECTS.find((s) => s === c?.subject);
    if (!subject) return { ok: false, error: `Unknown condition "${String(c?.subject)}".` };
    const value = typeof c.value === 'string' ? c.value.trim().slice(0, 500) : '';
    if (NEEDS_VALUE.has(subject) && !value) return { ok: false, error: `Condition "${subject}" needs a value.` };
    if (subject === 'license_group' && !(value in LICENSE_GROUPS)) return { ok: false, error: `Unknown license group "${value}".` };
    if (subject === 'severity' && !severityRank(value)) return { ok: false, error: 'Severity must be CRITICAL, HIGH, MEDIUM or LOW.' };
    if (subject === 'epss' && !(Number(value) >= 0 && Number(value) <= 1)) return { ok: false, error: 'EPSS must be a number between 0 and 1.' };
    conditions.push(NEEDS_VALUE.has(subject) ? { subject, value } : { subject });
  }
  if (conditions.length === 0) return { ok: false, error: 'A policy needs at least one condition.' };
  const projectIds = (Array.isArray(raw.projectIds) ? raw.projectIds : []).filter((p): p is string => typeof p === 'string').slice(0, 200);
  return { ok: true, value: { name, violation, operator, conditions, projectIds } };
}
