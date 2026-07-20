import { describe, expect, it } from 'vitest';
import { buildAuditDiff, formatAuditJson } from './buildAuditDiff';

describe('buildAuditDiff', () => {
  it('detects added, removed, and changed fields', () => {
    const { rows } = buildAuditDiff(
      { name: 'A', amount: 10, secretKeep: 'x' },
      { name: 'B', amount: 10, extra: true },
    );
    const byPath = Object.fromEntries(rows.map((r) => [r.path, r]));
    expect(byPath.name?.change).toBe('changed');
    expect(byPath.extra?.change).toBe('added');
    expect(byPath.secretKeep?.change).toBe('removed');
    expect(byPath.amount).toBeUndefined(); // unchanged omitted
  });

  it('renders large nested JSON without exceeding maxEntries', () => {
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (let i = 0; i < 400; i += 1) {
      before[`field_${i}`] = { nested: `old-${i}`, deep: { n: i } };
      after[`field_${i}`] = { nested: `new-${i}`, deep: { n: i + 1 } };
    }

    const result = buildAuditDiff(before, after, {
      maxDepth: 4,
      maxEntries: 80,
    });

    expect(result.rows.length).toBeLessThanOrEqual(80);
    expect(result.truncated).toBe(true);
    expect(result.rows.every((r) => typeof r.path === 'string')).toBe(true);
  });

  it('formatAuditJson truncates huge payloads', () => {
    const huge = { blob: 'x'.repeat(10_000) };
    const formatted = formatAuditJson(huge, 500);
    expect(formatted.truncated).toBe(true);
    expect(formatted.text.length).toBeLessThan(600);
    expect(formatted.text).toContain('[truncated');
  });
});
