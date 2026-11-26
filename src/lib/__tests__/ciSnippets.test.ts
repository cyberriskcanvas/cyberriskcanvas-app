import { describe, expect, it } from 'vitest';
import { ciReleaseSnippet } from '../ciSnippets';

describe('ciReleaseSnippet', () => {
  it('keeps GitHub expressions intact and names the instance', () => {
    const s = ciReleaseSnippet('https://canvas.example.com');
    expect(s).toContain('url: https://canvas.example.com');
    expect(s).toContain('${{ secrets.CRC_TOKEN }}');
    expect(s).toContain('release: ${{ github.ref_name }}');
    expect(s).not.toContain('\\${{');
  });
});
