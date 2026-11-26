import { describe, expect, it } from 'vitest';
import { findingId, parseFindingId } from '../findings';

describe('findingId', () => {
  it('round-trips component key and advisory through a URL-safe id', () => {
    const id = findingId('pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1?type=jar', 'CVE-2021-44228');
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parseFindingId(id)).toEqual({ componentKey: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1?type=jar', vulnId: 'CVE-2021-44228' });
  });

  it('rejects ids that are not ours', () => {
    expect(parseFindingId('not-an-id')).toBeNull();
    expect(parseFindingId(Buffer.from('[1,2]').toString('base64url'))).toBeNull();
  });
});
