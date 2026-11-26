import { describe, expect, it } from 'vitest';
import { evaluateCiFile, InvalidCiFile, sarifFindings } from '../ciEval';

const cdx = (spec: string, comps: unknown[]) => JSON.stringify({ bomFormat: 'CycloneDX', specVersion: spec, components: comps });
const sarif = (results: unknown[], rules: unknown[] = [], extra: object = {}) =>
  JSON.stringify({ version: '2.1.0', runs: [{ tool: { driver: { rules } }, results, ...extra }] });

describe('sbom', () => {
  it('accepts a complete CycloneDX 1.6', () => {
    expect(evaluateCiFile('sbom', cdx('1.6', [{ name: 'a', version: '1.0' }])).ok).toBe(true);
  });
  it('flags CycloneDX 1.5, missing versions and empty SBOMs', () => {
    expect(evaluateCiFile('sbom', cdx('1.5', [{ name: 'a', version: '1' }])).summary).toContain('older than 1.6');
    const noVer = evaluateCiFile('sbom', cdx('1.6', [{ name: 'a', version: 'NOASSERTION' }, { name: 'b' }]));
    expect(noVer.ok).toBe(false);
    expect(noVer.summary).toContain('2 components without name or version');
    expect(evaluateCiFile('sbom', cdx('1.6', [])).ok).toBe(false);
  });
  it('ignores the unversioned lockfile node that Trivy puts above the packages', () => {
    const bom = (extra: object[]) => JSON.stringify({
      bomFormat: 'CycloneDX', specVersion: '1.7',
      components: [{ type: 'application', name: 'package-lock.json', 'bom-ref': 'lock' }, { type: 'library', name: 'a', version: '1', 'bom-ref': 'a' }, ...extra],
      dependencies: [{ ref: 'lock', dependsOn: ['a'] }],
    });
    expect(evaluateCiFile('sbom', bom([])).ok).toBe(true);
    // a library without a version still counts, and so does an application nothing hangs under
    expect(evaluateCiFile('sbom', bom([{ type: 'library', name: 'b', 'bom-ref': 'b' }])).summary).toContain('1 components without name or version');
    expect(evaluateCiFile('sbom', bom([{ type: 'application', name: 'x', 'bom-ref': 'x' }])).summary).toContain('1 components without name or version');
  });
  it('accepts SPDX 3.0.1 but flags 3.0.0 and SPDX 2', () => {
    const spdx3 = (v: string) =>
      JSON.stringify({ '@context': `https://spdx.org/rdf/${v}/spdx-context.jsonld`, '@graph': [{ type: 'software_Package', name: 'a', software_packageVersion: '1' }] });
    expect(evaluateCiFile('sbom', spdx3('3.0.1')).ok).toBe(true);
    expect(evaluateCiFile('sbom', spdx3('3.0.0')).ok).toBe(false);
    const v2 = evaluateCiFile('sbom', JSON.stringify({ spdxVersion: 'SPDX-2.3', packages: [{ name: 'a', versionInfo: '1' }] }));
    expect(v2.ok).toBe(false);
  });
  it('rejects unknown formats and non-JSON', () => {
    expect(() => evaluateCiFile('sbom', '{}')).toThrow(InvalidCiFile);
    expect(() => evaluateCiFile('sbom', 'nope')).toThrow(InvalidCiFile);
  });
});

describe('sarif', () => {
  it('secrets fail on any finding, even a note', () => {
    expect(evaluateCiFile('secrets', sarif([{ level: 'note', ruleId: 'x' }])).ok).toBe(false);
    expect(evaluateCiFile('secrets', sarif([])).ok).toBe(true);
  });
  it('sast/vulnscan fail only on errors', () => {
    expect(evaluateCiFile('sast', sarif([{ level: 'warning' }])).ok).toBe(true);
    expect(evaluateCiFile('vulnscan', sarif([{ level: 'error' }])).ok).toBe(false);
  });
  it('reads severity from the rule when the result has none', () => {
    const rules = [{ id: 'r1', defaultConfiguration: { level: 'error' } }];
    expect(evaluateCiFile('sast', sarif([{ ruleId: 'r1', ruleIndex: 0 }], rules)).ok).toBe(false);
    expect(evaluateCiFile('sast', sarif([{ ruleId: 'r1' }], rules)).ok).toBe(false);
  });
  it('takes the severity from security-severity, then rule tags, then the level', () => {
    const rules = [
      { id: 'cvss', properties: { 'security-severity': '9.8' }, defaultConfiguration: { level: 'note' } },
      { id: 'tag', properties: { tags: ['vulnerability', 'MEDIUM'] }, defaultConfiguration: { level: 'error' } },
      { id: 'lvl', defaultConfiguration: { level: 'warning' } },
    ];
    const findings = sarifFindings(sarif([{ ruleId: 'cvss', ruleIndex: 0, level: 'note' }, { ruleId: 'tag', ruleIndex: 1 }, { ruleId: 'lvl' }, { ruleId: 'x', level: 'error', properties: { 'security-severity': '3.1' } }], rules));
    expect(findings.map((f) => f.severity)).toEqual(['critical', 'medium', 'medium', 'low']);
  });
  it('fails from the project threshold on and counts by severity', () => {
    const file = sarif([{ level: 'warning' }, { level: 'warning' }, { level: 'note' }]);
    const high = evaluateCiFile('sast', file);
    expect(high.ok).toBe(true);
    expect(high.summary).toBe('3 findings (2 medium, 1 low)');
    expect(high.metrics).toMatchObject({ findings: 3, critical: 0, high: 0, medium: 2, low: 1 });
    expect(evaluateCiFile('sast', file, { failOn: 'medium' }).ok).toBe(false);
    // secrets ignore the threshold
    expect(evaluateCiFile('secrets', sarif([{ level: 'note' }]), { failOn: 'critical' }).ok).toBe(false);
  });
  it('lists location, title and a safe help link', () => {
    const rules = [{ id: 'r', shortDescription: { text: 'Hard-coded secret' }, helpUri: 'javascript:alert(1)' }];
    const [f] = sarifFindings(sarif([{ ruleId: 'r', ruleIndex: 0, message: { text: 'found' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'lib/a.ts' }, region: { startLine: 54 } } }] }], rules));
    expect(f).toMatchObject({ title: 'Hard-coded secret', message: 'found', location: 'lib/a.ts:54', helpUri: null });
  });
  it('rejects failed runs and non-SARIF', () => {
    expect(() => evaluateCiFile('sast', sarif([], [], { invocations: [{ executionSuccessful: false }] }))).toThrow(InvalidCiFile);
    expect(() => evaluateCiFile('sast', '{"version":"1"}')).toThrow(InvalidCiFile);
  });
  it('rejects unknown sources', () => {
    expect(() => evaluateCiFile('lint', sarif([]))).toThrow(InvalidCiFile);
  });
});

describe('tests against the running product', () => {
  it('dast: like SAST, only errors fail', () => {
    expect(evaluateCiFile('dast', sarif([{ level: 'warning' }])).ok).toBe(true);
    expect(evaluateCiFile('dast', sarif([{ level: 'error' }])).ok).toBe(false);
  });

  it('tls: HIGH/CRITICAL/FATAL fail, medium only counts', () => {
    const f = (severity: string) => ({ id: 'x', ip: '1.2.3.4', port: '443', severity, finding: 'something' });
    expect(evaluateCiFile('tls', JSON.stringify([f('OK'), f('INFO'), f('MEDIUM')])).ok).toBe(true);
    const bad = evaluateCiFile('tls', JSON.stringify([f('OK'), { ...f('HIGH'), id: 'TLS1', finding: 'offered (deprecated)' }]));
    expect(bad.ok).toBe(false);
    expect(bad.summary).toContain('TLS1');
    // pretty format with nested sections
    expect(evaluateCiFile('tls', JSON.stringify({ scanResult: [{ protocols: [f('CRITICAL')], ciphers: [f('OK')] }] })).ok).toBe(false);
    expect(() => evaluateCiFile('tls', '[]')).toThrow(InvalidCiFile);
  });

  it('ports: compares open ports with the declared ones', () => {
    const xml = (ports: number[]) => `<?xml version="1.0"?><nmaprun><host><ports>${ports.map((p) => `<port protocol="tcp" portid="${p}"><state state="open" reason="syn-ack"/></port>`).join('')}<port protocol="tcp" portid="9999"><state state="closed"/></port></ports></host></nmaprun>`;
    expect(evaluateCiFile('ports', xml([443, 8883]), { declaredPorts: [443, 8883, 502] }).ok).toBe(true);
    const bad = evaluateCiFile('ports', xml([443, 22]), { declaredPorts: [443] });
    expect(bad.ok).toBe(false);
    expect(bad.summary).toContain('22');
    expect(bad.summary).not.toContain('9999'); // closed ports are ignored
    const none = evaluateCiFile('ports', xml([22]), { declaredPorts: [] });
    expect(none.ok).toBe(true);
    expect(none.summary).toContain('no ports are declared');
    expect(() => evaluateCiFile('ports', '<html/>')).toThrow(InvalidCiFile);
  });
});
