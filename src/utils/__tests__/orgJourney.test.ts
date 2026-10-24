import { describe, expect, it } from 'vitest';
import { deriveOrgStations, type OrgInput } from '../orgJourney';
import { SECURITY_TXT_DEFAULTS } from '@/lib/organisation';

const empty: OrgInput = {
  name: '', publisherName: null, publisherNamespace: null, contactDetails: null,
  securityTxt: SECURITY_TXT_DEFAULTS, checklist: {}, sdl: {}, sdlTotal: 10, readiness: {}, readinessQuestionIds: ['R01', 'R02', 'R03'],
};
const by = (o: OrgInput, id: string) => deriveOrgStations(o).find((s) => s.id === id)!;

describe('deriveOrgStations', () => {
  it('starts with everything open', () => {
    expect(deriveOrgStations(empty).map((s) => s.status)).toEqual(['open', 'open', 'open', 'open', 'open']);
  });
  it('profile: name and publisher and namespace', () => {
    expect(by({ ...empty, name: 'ACME' }, 'profile')).toMatchObject({ status: 'progress', done: 1, total: 3, missing: ['publisher', 'namespace'] });
    expect(by({ ...empty, name: 'ACME', publisherName: 'ACME', publisherNamespace: 'https://acme.example' }, 'profile').status).toBe('done');
  });
  it('contact: contact details, domain and PSIRT email', () => {
    const o = { ...empty, contactDetails: 'psirt@acme.example', securityTxt: { ...SECURITY_TXT_DEFAULTS, domain: 'acme.example' } };
    expect(by(o, 'contact')).toMatchObject({ status: 'progress', missing: ['psirt'] });
  });
  it('requirements: the four organisation-wide requirements', () => {
    const checklist = { 'VH.5': { status: 'compliant' as const }, 'VH.6a': { status: 'partial' as const } };
    expect(by({ ...empty, checklist }, 'requirements')).toMatchObject({ status: 'progress', done: 2, total: 4, missing: ['VH.6', 'VH.8a'] });
  });
  it('sdl and readiness: progress until everything is done', () => {
    expect(by({ ...empty, sdl: { A: true } }, 'sdl').status).toBe('progress');
    expect(by({ ...empty, sdl: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`X${i}`, true])) }, 'sdl').status).toBe('done');
    expect(by({ ...empty, readiness: { R01: 'yes', R02: 'no' } }, 'readiness')).toMatchObject({ status: 'progress', done: 1, total: 3 });
    expect(by({ ...empty, readiness: { R01: 'yes', R02: 'yes', R03: 'yes' } }, 'readiness').status).toBe('done');
  });
});
