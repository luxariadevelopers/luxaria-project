import { describe, expect, it } from 'vitest';
import type { MaterialConsumptionLine } from './types';
import { MaterialConsumptionAlert } from './types';
import {
  DEFAULT_VARIANCE_THRESHOLD_PERCENT,
  linesRequiringExplanation,
  validateApproveComment,
  validateSubmitExplanations,
} from './validation';

const line = (
  overrides: Partial<MaterialConsumptionLine> = {},
): MaterialConsumptionLine => ({
  id: 'line-1',
  boqItemId: 'boq-1',
  boqCode: 'BOQ-001',
  materialId: 'mat-1',
  materialCode: 'CEM-01',
  materialName: 'Cement',
  baseUnit: 'bag',
  workQuantityCompleted: 10,
  coefficient: 7.5,
  standardMaterialRequirement: 75,
  wastagePercentage: 2,
  allowedWastage: 1.5,
  expectedConsumption: 76.5,
  actualMaterialIssued: 80,
  materialReturned: 2,
  netActualConsumption: 78,
  varianceQuantity: 1.5,
  variancePercentage: 6,
  varianceValue: 600,
  standardRate: 400,
  standardSource: 'boq_coefficient' as MaterialConsumptionLine['standardSource'],
  alerts: [MaterialConsumptionAlert.AboveAllowedVariance],
  requiresApproval: true,
  explanation: null,
  explainedBy: null,
  explainedAt: null,
  ...overrides,
});

describe('linesRequiringExplanation', () => {
  it('returns only lines flagged requiresApproval', () => {
    const lines = [
      line({ id: 'a', requiresApproval: true }),
      line({ id: 'b', requiresApproval: false }),
    ];
    expect(linesRequiringExplanation(lines).map((l) => l.id)).toEqual(['a']);
  });
});

describe('validateSubmitExplanations', () => {
  it('requires explanation on every requiresApproval line', () => {
    const result = validateSubmitExplanations({
      lines: [line()],
      explanations: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.field).toBe('explanation');
      expect(result.issues[0]?.message).toMatch(/Explanation required/);
    }
  });

  it('passes when all flagged lines have explanations', () => {
    const result = validateSubmitExplanations({
      lines: [line()],
      explanations: { 'line-1': 'Richer mix at site' },
    });
    expect(result.ok).toBe(true);
  });

  it('requires evidence when variance is at or above threshold', () => {
    const result = validateSubmitExplanations({
      lines: [line({ variancePercentage: DEFAULT_VARIANCE_THRESHOLD_PERCENT })],
      explanations: { 'line-1': 'Explained' },
      requireEvidenceWhenAboveThreshold: true,
      evidenceByLine: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === 'evidence')).toBe(true);
    }
  });

  it('passes with evidence when variance is above threshold', () => {
    const evidence = new File(['x'], 'weighbridge.pdf', {
      type: 'application/pdf',
    });
    const result = validateSubmitExplanations({
      lines: [line({ variancePercentage: 8 })],
      explanations: { 'line-1': 'Explained with slip attached' },
      requireEvidenceWhenAboveThreshold: true,
      evidenceByLine: { 'line-1': [evidence] },
    });
    expect(result.ok).toBe(true);
  });

  it('does not require evidence below threshold when only explanation needed', () => {
    const result = validateSubmitExplanations({
      lines: [
        line({
          variancePercentage: DEFAULT_VARIANCE_THRESHOLD_PERCENT - 1,
          alerts: [MaterialConsumptionAlert.NegativeConsumption],
        }),
      ],
      explanations: { 'line-1': 'Return entry pending' },
      requireEvidenceWhenAboveThreshold: true,
      evidenceByLine: {},
    });
    expect(result.ok).toBe(true);
  });
});

describe('validateApproveComment', () => {
  it('requires approval comment when report requiresApproval', () => {
    expect(
      validateApproveComment({ requiresApproval: true, approvalComment: '  ' }).ok,
    ).toBe(false);
  });

  it('allows empty comment when report does not require approval', () => {
    expect(
      validateApproveComment({ requiresApproval: false, approvalComment: null }).ok,
    ).toBe(true);
  });

  it('accepts non-empty approval comment', () => {
    expect(
      validateApproveComment({
        requiresApproval: true,
        approvalComment: 'Reviewed with site engineer',
      }).ok,
    ).toBe(true);
  });
});

describe('resolveMaterialVarianceCapabilities', () => {
  it('maps manage permission for explain/submit (not material_variance.*)', async () => {
    const { resolveMaterialVarianceCapabilities } = await import('./roleAccess');
    const caps = resolveMaterialVarianceCapabilities((code) =>
      code === 'material_consumption.manage' ? true : false,
    );
    expect(caps.canManage).toBe(true);
    expect(caps.canApprove).toBe(false);
  });
});
