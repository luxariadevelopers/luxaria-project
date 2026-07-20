import { describe, expect, it } from 'vitest';
import {
  categoryToEvidenceFormValues,
  defaultCreateFormValues,
  evidenceRulesSchema,
  expenseCategoryCreateSchema,
  expenseCategoryUpdateSchema,
  toApprovalLimit,
  toParentCategoryId,
} from './validation';

const LEDGER_ID = '507f1f77bcf86cd799439011';

describe('expense category validation', () => {
  it('requires category code, name, and ledger mapping on create', () => {
    const result = expenseCategoryCreateSchema.safeParse({
      categoryCode: '',
      name: '',
      parentCategoryId: '',
      defaultLedgerAccountId: '',
      requiresBill: false,
      requiresSignature: false,
      requiresPhoto: false,
      approvalLimit: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('categoryCode');
      expect(paths).toContain('name');
      expect(paths).toContain('defaultLedgerAccountId');
    }
  });

  it('accepts a valid create payload with evidence settings', () => {
    const result = expenseCategoryCreateSchema.safeParse({
      ...defaultCreateFormValues({
        categoryCode: 'TRANSPORT',
        name: 'Transport',
        defaultLedgerAccountId: LEDGER_ID,
        requiresBill: true,
        requiresPhoto: true,
        approvalLimit: '2500',
      }),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiresBill).toBe(true);
      expect(result.data.requiresPhoto).toBe(true);
      expect(result.data.approvalLimit).toBe('2500');
      expect(toApprovalLimit(result.data.approvalLimit)).toBe(2500);
    }
  });

  it('rejects negative approval limit thresholds', () => {
    const result = evidenceRulesSchema.safeParse({
      requiresBill: true,
      requiresSignature: false,
      requiresPhoto: false,
      approvalLimit: '-1',
    });
    expect(result.success).toBe(false);
  });

  it('allows clearing approval limit with empty string', () => {
    const empty = evidenceRulesSchema.safeParse({
      requiresBill: false,
      requiresSignature: false,
      requiresPhoto: false,
      approvalLimit: '',
    });
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(toApprovalLimit(empty.data.approvalLimit)).toBeNull();
    }

    const cleared = evidenceRulesSchema.safeParse(
      categoryToEvidenceFormValues({
        requiresBill: true,
        requiresSignature: true,
        requiresPhoto: false,
        approvalLimit: null,
      }),
    );
    expect(cleared.success).toBe(true);
  });

  it('requires ledger mapping on update', () => {
    const result = expenseCategoryUpdateSchema.safeParse({
      name: 'Labour',
      parentCategoryId: '',
      defaultLedgerAccountId: 'not-an-id',
      requiresBill: false,
      requiresSignature: true,
      requiresPhoto: false,
      approvalLimit: '1000',
    });
    expect(result.success).toBe(false);
  });

  it('normalises parent and approval limit helpers', () => {
    expect(toParentCategoryId('')).toBeNull();
    expect(toParentCategoryId('  ')).toBeNull();
    expect(toParentCategoryId(LEDGER_ID)).toBe(LEDGER_ID);
    expect(toApprovalLimit(undefined)).toBeNull();
    expect(toApprovalLimit(null)).toBeNull();
    expect(toApprovalLimit('')).toBeNull();
    expect(toApprovalLimit('0')).toBe(0);
    expect(toApprovalLimit('5000')).toBe(5000);
    expect(toApprovalLimit(5000)).toBe(5000);
  });
});
