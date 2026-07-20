import { BadRequestException } from '@nestjs/common';
import { validateAndNormalizeLines } from './journal.validation';

describe('validateAndNormalizeLines', () => {
  const a1 = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const a2 = 'bbbbbbbbbbbbbbbbbbbbbbbb';

  it('requires balanced debit and credit', () => {
    expect(() =>
      validateAndNormalizeLines([
        { accountId: a1, debit: 100, credit: 0 },
        { accountId: a2, debit: 0, credit: 90 },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects a line with both debit and credit', () => {
    expect(() =>
      validateAndNormalizeLines([
        { accountId: a1, debit: 50, credit: 50 },
        { accountId: a2, debit: 0, credit: 0 },
      ]),
    ).toThrow(/both debit and credit/i);
  });

  it('normalizes a valid balanced entry', () => {
    const result = validateAndNormalizeLines([
      { accountId: a1, debit: 10_000.555, credit: 0 },
      { accountId: a2, debit: 0, credit: 10_000.555 },
    ]);
    expect(result.totalDebit).toBe(result.totalCredit);
    expect(result.lines).toHaveLength(2);
  });
});
