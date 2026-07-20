import { describe, expect, it } from 'vitest';
import { resolveJournalSourceLink } from './sourceLinks';

describe('resolveJournalSourceLink', () => {
  it('labels manual journals', () => {
    const link = resolveJournalSourceLink({
      sourceModule: 'manual',
      sourceEntityType: 'manual_journal',
      sourceEntityId: null,
      reversalOf: null,
    });
    expect(link.label).toBe('Manual');
    expect(link.href).toBeNull();
  });

  it('shows vendor invoice source identifiers for tracing', () => {
    const link = resolveJournalSourceLink({
      sourceModule: 'vendor_invoice',
      sourceEntityType: 'vendor_invoice',
      sourceEntityId: '507f1f77bcf86cd799439011',
      reversalOf: null,
    });
    expect(link.label).toBe('Vendor invoice');
    expect(link.detail).toContain('507f1f77bcf86cd799439011');
    expect(link.href).toBeNull();
  });

  it('deep-links journal reversals to the original journal detail', () => {
    const link = resolveJournalSourceLink({
      sourceModule: 'journal',
      sourceEntityType: 'journal_reversal',
      sourceEntityId: '507f1f77bcf86cd799439099',
      reversalOf: '507f1f77bcf86cd799439099',
    });
    expect(link.label).toMatch(/Journal/i);
    expect(link.detail).toContain('journal_reversal');
    expect(link.href).toBe(
      '/accounting/journals/507f1f77bcf86cd799439099',
    );
  });
});
