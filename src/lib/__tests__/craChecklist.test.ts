import { describe, expect, it } from 'vitest';
import { checklistMappings, sanitizeCraChecklist, sanitizeCraChecklistEntry } from '../craChecklist';
import { generateStatementOfApplicability } from '@/data/tr03183h';

describe('craChecklist', () => {
  it('keeps known ids with valid statuses and trims notes', () => {
    expect(sanitizeCraChecklist({
      'ER.1': { status: 'compliant', note: '  scan per release ' },
      'ER.2': { status: 'maybe' },
      'XX.9': { status: 'compliant' },
      'VH.5': 'compliant',
    })).toEqual({ 'ER.1': { status: 'compliant', note: 'scan per release' } });
    expect(sanitizeCraChecklist(null)).toEqual({});
    expect(sanitizeCraChecklistEntry({ status: 'partial', note: 'x'.repeat(3000) })?.note).toHaveLength(2000);
  });

  it('takes precedence over node mappings in the SoA when put first', () => {
    const nodeMappings = [{ requirementId: 'ER.1', status: 'non-compliant' as const }];
    const rows = generateStatementOfApplicability([...checklistMappings({ 'ER.1': { status: 'compliant', note: 'ok' } }), ...nodeMappings]);
    expect(rows.find((r) => r.requirementId === 'ER.1')).toMatchObject({ status: 'compliant', justification: 'ok' });
  });
});
