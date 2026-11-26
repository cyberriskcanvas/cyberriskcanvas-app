import { describe, expect, it } from 'vitest';
import { selectVersionsToPrune, type RetainedVersion } from '../versionRetention';

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 0, minute));
const manual = (n: number): RetainedVersion => ({ id: `m${n}`, createdAt: at(n), projectVersionId: null });
const snapshot = (n: number, pv = 'pv1'): RetainedVersion => ({ id: `s${n}`, createdAt: at(n), projectVersionId: pv });

describe('selectVersionsToPrune', () => {
  it('keeps a freeze snapshot older than 51 manual versions', () => {
    const versions = [snapshot(0), ...Array.from({ length: 51 }, (_, i) => manual(i + 1))];
    expect(selectVersionsToPrune(versions, 50)).toEqual(['m1']);
  });

  it('does not count snapshots toward the limit', () => {
    const versions = [...Array.from({ length: 50 }, (_, i) => manual(i)), snapshot(100), snapshot(101, 'pv2')];
    expect(selectVersionsToPrune(versions, 50)).toEqual([]);
  });

  it('prunes the oldest manual versions regardless of input order', () => {
    const versions = [manual(3), snapshot(0), manual(1), manual(2)];
    expect(selectVersionsToPrune(versions, 1)).toEqual(['m2', 'm1']);
  });
});
