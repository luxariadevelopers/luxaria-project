import {
  assertPositiveIssueQuantity,
  validateIssueForm,
} from '../validation';

const validIds = {
  projectId: '507f1f77bcf86cd799439011',
  receivedBy: '507f1f77bcf86cd799439012',
  boqItemId: '507f1f77bcf86cd799439013',
  materialId: '507f1f77bcf86cd799439014',
};

describe('assertPositiveIssueQuantity', () => {
  it('requires positive quantity', () => {
    const result = assertPositiveIssueQuantity({
      materialLabel: 'CEM-001',
      quantity: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('allows valid quantity', () => {
    expect(
      assertPositiveIssueQuantity({
        materialLabel: 'CEM-001',
        quantity: 5,
      }).ok,
    ).toBe(true);
  });
});

describe('validateIssueForm', () => {
  const baseLine = {
    materialId: validIds.materialId,
    materialLabel: 'CEM-001',
    unit: 'bag',
    quantityText: '10',
    batch: '',
    notes: '',
  };

  it('accepts a valid draft payload', () => {
    const result = validateIssueForm({
      projectId: validIds.projectId,
      issueDate: '2026-07-21',
      receivedBy: validIds.receivedBy,
      boqItemId: validIds.boqItemId,
      workLocation: 'Block A – Column casting',
      lines: [baseLine],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.items).toHaveLength(1);
      expect(result.payload.items[0]?.quantity).toBe(10);
    }
  });

  it('requires work location', () => {
    const result = validateIssueForm({
      projectId: validIds.projectId,
      issueDate: '2026-07-21',
      receivedBy: validIds.receivedBy,
      boqItemId: validIds.boqItemId,
      workLocation: '   ',
      lines: [baseLine],
    });
    expect(result.ok).toBe(false);
  });

  it('requires at least one material line', () => {
    const result = validateIssueForm({
      projectId: validIds.projectId,
      issueDate: '2026-07-21',
      receivedBy: validIds.receivedBy,
      boqItemId: validIds.boqItemId,
      workLocation: 'Block A',
      lines: [{ ...baseLine, quantityText: '' }],
    });
    expect(result.ok).toBe(false);
  });
});
