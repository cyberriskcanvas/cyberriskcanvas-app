import { describe, expect, it } from 'vitest';
import { checklistSource, isOrgRequirement, mergeChecklist, sanitizeOrgProfile, sanitizeSecurityTxt } from '../organisation';

const org = { 'VH.6a': { status: 'compliant', note: 'security.txt live' }, 'VH.5': { status: 'partial' }, 'ER.1': { status: 'compliant' } };

describe('mergeChecklist', () => {
  it('inherits organisation-wide requirements and ignores other ids from the organisation', () => {
    const m = mergeChecklist(org, {});
    expect(m['VH.6a']).toEqual({ status: 'compliant', note: 'security.txt live' });
    expect(m['VH.5'].status).toBe('partial');
    expect(m['ER.1']).toBeUndefined();
  });
  it('lets the product override and keeps its own entries', () => {
    const m = mergeChecklist(org, { 'VH.6a': { status: 'non-compliant', note: 'product has no public contact' }, 'ER.1': { status: 'compliant' } });
    expect(m['VH.6a'].status).toBe('non-compliant');
    expect(m['ER.1'].status).toBe('compliant');
    expect(m['VH.5'].status).toBe('partial');
  });
  it('survives garbage input', () => {
    expect(mergeChecklist(null, 'x')).toEqual({});
  });
});

describe('checklistSource', () => {
  it('names where an entry comes from', () => {
    expect(checklistSource('VH.6a', org, {})).toBe('organisation');
    expect(checklistSource('VH.6a', org, { 'VH.6a': { status: 'partial' } })).toBe('product');
    expect(checklistSource('VH.2', org, {})).toBeNull();
    expect(isOrgRequirement('VH.5')).toBe(true);
    expect(isOrgRequirement('VH.2')).toBe(false);
  });
});

describe('sanitizeOrgProfile', () => {
  it('returns only given fields, cleaned', () => {
    expect(sanitizeOrgProfile({ publisherName: '  ACME  ', contactDetails: '', publisherCategory: 'vendor', junk: 1 }))
      .toEqual({ publisherName: 'ACME', contactDetails: null, publisherCategory: 'vendor' });
    expect(sanitizeOrgProfile({ publisherCategory: 'nope' })).toEqual({});
  });
});

describe('sanitizeSecurityTxt', () => {
  it('keeps valid values and drops invalid ones', () => {
    const c = sanitizeSecurityTxt({ domain: 'https://acme.example/', psirtEmail: 'psirt@acme.example', csirtEmail: 'not-an-email', reportWebUri: 'javascript:alert(1)', policyUri: 'https://acme.example/policy', expiresDays: 9999 });
    expect(c.domain).toBe('acme.example');
    expect(c.psirtEmail).toBe('psirt@acme.example');
    expect(c.csirtEmail).toBe('');
    expect(c.reportWebUri).toBe('');
    expect(c.policyUri).toBe('https://acme.example/policy');
    expect(c.expiresDays).toBe(365);
  });
  it('gives defaults for nothing', () => {
    expect(sanitizeSecurityTxt(undefined).expiresDays).toBe(365);
  });
});
