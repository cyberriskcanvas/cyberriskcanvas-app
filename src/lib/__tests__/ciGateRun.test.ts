import { describe, expect, it } from 'vitest';
import { parseGateParams } from '../ciGateRun';

const q = (s: string) => new URLSearchParams(s);

describe('parseGateParams', () => {
  it('leaves failOn to the project setting when the pipeline sends none', () => {
    expect(parseGateParams(q(''))).toEqual({ require: [], failOn: null, checkModel: false });
    expect(parseGateParams(q('failOn=MEDIUM'))).toEqual({ require: [], failOn: 'medium', checkModel: false });
  });
  it('treats "model" as the architecture check, not a source', () => {
    expect(parseGateParams(q('require=sast,model&failOn=Critical'))).toEqual({ require: ['sast'], failOn: 'critical', checkModel: true });
  });
  it('rejects unknown sources and severities', () => {
    expect(parseGateParams(q('require=nope'))).toEqual({ error: "Unknown source 'nope' in require" });
    expect(parseGateParams(q('failOn=urgent'))).toHaveProperty('error');
  });
});
