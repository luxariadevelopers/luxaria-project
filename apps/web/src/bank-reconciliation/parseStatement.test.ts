import { describe, expect, it } from 'vitest';
import {
  parseAmountValue,
  parseDateValue,
  previewCsvStatement,
  readCsvHeaders,
  suggestColumnMapping,
} from './parseStatement';

const sampleCsv = `Txn Date,Narration,Withdrawal,Deposit,Balance,UTR / Ref No
01/07/2026,NEFT IN,,5000.00,15000.00,UTR123
02/07/2026,ATM WDL,1000,,14000.00,
bad-date,SKIP,10,,0,
03/07/2026,ZERO ROW,,,14000.00,
`;

describe('parseDateValue / parseAmountValue', () => {
  it('parses dd/mm/yyyy', () => {
    const d = parseDateValue('01/07/2026');
    expect(d).not.toBeNull();
    expect(d!.toISOString().startsWith('2026-07-01')).toBe(true);
  });

  it('returns null for invalid date', () => {
    expect(parseDateValue('not-a-date')).toBeNull();
  });

  it('parses amounts with commas and currency noise', () => {
    expect(parseAmountValue('1,234.50')).toBe(1234.5);
    expect(parseAmountValue('₹ 100')).toBe(100);
  });
});

describe('previewCsvStatement', () => {
  it('maps debit/credit columns and skips invalid rows', () => {
    const result = previewCsvStatement(sampleCsv, {
      date: 'Txn Date',
      description: 'Narration',
      debit: 'Withdrawal',
      credit: 'Deposit',
      balance: 'Balance',
      transactionId: 'UTR / Ref No',
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.credit).toBe(5000);
    expect(result.rows[1]?.debit).toBe(1000);
    expect(result.skippedRows).toBeGreaterThan(0);
  });

  it('errors when mapped columns are missing from header', () => {
    expect(() =>
      previewCsvStatement('Date,Amount\n01/07/2026,10', {
        date: 'Txn Date',
        amount: 'Amount',
      }),
    ).toThrow(/Missing mapped columns/);
  });

  it('errors when no rows parse', () => {
    expect(() =>
      previewCsvStatement('Date,Amount\nbad,0\n', {
        date: 'Date',
        amount: 'Amount',
      }),
    ).toThrow(/No statement lines could be parsed/);
  });

  it('supports signed amount column', () => {
    const csv = 'Date,Amount\n2026-07-01,-250\n2026-07-02,400\n';
    const result = previewCsvStatement(csv, { date: 'Date', amount: 'Amount' });
    expect(result.rows[0]?.debit).toBe(250);
    expect(result.rows[1]?.credit).toBe(400);
  });
});

describe('suggestColumnMapping / readCsvHeaders', () => {
  it('suggests common Indian bank headers', () => {
    const headers = readCsvHeaders(sampleCsv);
    const suggested = suggestColumnMapping(headers);
    expect(suggested.date).toBe('Txn Date');
    expect(suggested.debit).toBe('Withdrawal');
    expect(suggested.credit).toBe('Deposit');
  });
});
