import { describe, expect, it } from 'vitest';
import {
  defaultWorkflowFormState,
  validateWorkflowForm,
} from './validation';

describe('approval workflow validation', () => {
  it('requires module, entity type, and assignees', () => {
    const result = validateWorkflowForm({
      module: '',
      entityType: '',
      form: defaultWorkflowFormState(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.module).toBeTruthy();
      expect(result.fieldErrors.entityType).toBeTruthy();
      expect(result.fieldErrors['steps.0.assignees']).toBeTruthy();
    }
  });

  it('builds upsert payload when valid', () => {
    const form = defaultWorkflowFormState();
    form.name = 'PO approval';
    form.steps[0] = {
      ...form.steps[0],
      roleIds: ['507f1f77bcf86cd799439011'],
      minimumAmount: 0,
      maximumAmount: 100000,
    };

    const result = validateWorkflowForm({
      module: 'procurement',
      entityType: 'purchase_order',
      form,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.module).toBe('procurement');
      expect(result.input.entityType).toBe('purchase_order');
      expect(result.input.name).toBe('PO approval');
      expect(result.input.steps[0]?.roleIds).toEqual([
        '507f1f77bcf86cd799439011',
      ]);
    }
  });
});
