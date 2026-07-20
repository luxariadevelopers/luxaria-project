import { describe, expect, it } from 'vitest';
import { resolveBookTransactionLink } from './transactionLinks';

describe('resolveBookTransactionLink', () => {
  it('links to journal detail from drillDown journalId', () => {
    const link = resolveBookTransactionLink({
      journalId: '507f1f77bcf86cd799439011',
      journalNumber: 'JV-100',
      drillDown: [
        {
          label: 'Journal JV-100',
          href: '/api/v1/journals/507f1f77bcf86cd799439011',
          journalId: '507f1f77bcf86cd799439011',
        },
      ],
    });
    expect(link).toEqual({
      to: '/accounting/journals/507f1f77bcf86cd799439011',
      label: 'Journal JV-100',
    });
  });

  it('returns null for non-ObjectId journal ids', () => {
    expect(
      resolveBookTransactionLink({
        journalId: 'not-an-id',
        journalNumber: 'X',
        drillDown: [],
      }),
    ).toBeNull();
  });
});
