import { describe, expect, it } from 'vitest';
import {
  duplicateImportMessage,
  validateColumnMapping,
  validateManualMatchAmounts,
  validateStatementFile,
  createSessionSchema,
} from './validation';

const oid = '507f1f77bcf86cd799439011';

describe('validateColumnMapping', () => {
  it('requires date', () => {
    const result = validateColumnMapping({ debit: 'Withdrawal' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/date is required/);
  });

  it('requires debit/credit or amount', () => {
    const result = validateColumnMapping({ date: 'Txn Date' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/debit\/credit and\/or amount/);
  });

  it('accepts date + amount mapping', () => {
    const result = validateColumnMapping({ date: 'Date', amount: 'Amount' });
    expect(result.ok).toBe(true);
  });

  it('accepts date + debit/credit mapping', () => {
    const result = validateColumnMapping({
      date: 'Txn Date',
      debit: 'Withdrawal',
      credit: 'Deposit',
    });
    expect(result.ok).toBe(true);
  });
});

describe('duplicateImportMessage', () => {
  it('returns Nest-aligned message when lines already exist', () => {
    expect(duplicateImportMessage(3)).toMatch(/replaceExisting=true/);
  });

  it('returns null when session has no lines', () => {
    expect(duplicateImportMessage(0)).toBeNull();
  });
});

describe('validateStatementFile', () => {
  it('rejects missing file', () => {
    expect(validateStatementFile(null).ok).toBe(false);
  });

  it('rejects unsupported extension', () => {
    const file = new File(['a'], 'statement.pdf', { type: 'application/pdf' });
    const result = validateStatementFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/CSV, TXT, XLS, XLSX/);
  });

  it('accepts csv', () => {
    const file = new File(['a,b\n1,2'], 'statement.csv', { type: 'text/csv' });
    expect(validateStatementFile(file).ok).toBe(true);
  });

  it('accepts xlsx', () => {
    const file = new File(['x'], 'statement.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(validateStatementFile(file).ok).toBe(true);
  });
});

describe('validateManualMatchAmounts', () => {
  it('accepts bank debit vs book credit', () => {
    expect(
      validateManualMatchAmounts([{ debit: 100, credit: 0 }], [
        { debit: 0, credit: 100 },
      ]).ok,
    ).toBe(true);
  });

  it('rejects unbalanced selection', () => {
    const result = validateManualMatchAmounts(
      [{ debit: 100, credit: 0 }],
      [{ debit: 50, credit: 0 }],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/do not reconcile/);
  });
});

describe('createSessionSchema', () => {
  it('rejects inverted date range', () => {
    const parsed = createSessionSchema.safeParse({
      bankAccountId: oid,
      statementFrom: '2026-07-31',
      statementTo: '2026-07-01',
      statementOpeningBalance: 0,
      statementClosingBalance: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid session', () => {
    const parsed = createSessionSchema.safeParse({
      bankAccountId: oid,
      statementFrom: '2026-07-01',
      statementTo: '2026-07-31',
      statementOpeningBalance: 1000,
      statementClosingBalance: 2000,
      notes: '',
    });
    expect(parsed.success).toBe(true);
  });
});
