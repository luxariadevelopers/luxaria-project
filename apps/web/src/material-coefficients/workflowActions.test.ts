import { describe, expect, it } from 'vitest';
import {
  MaterialCoefficientStatus,
  type PublicMaterialCoefficient,
} from './types';
import { resolveMaterialCoefficientActions } from './workflowActions';
import { resolveMaterialCoefficientCapabilities } from './roleAccess';
import { BoqUnit } from './units';

const baseRow: PublicMaterialCoefficient = {
  id: '1',
  standardNumber: 'MCS-2026-000001',
  scopeKey: 'g|wt:brick|mat:x|square_foot',
  projectId: null,
  isProjectOverride: false,
  overridesStandardId: null,
  boqItemId: null,
  workType: 'Brick',
  outputUnit: BoqUnit.SquareFoot,
  materialId: '507f1f77bcf86cd799439011',
  materialCode: 'BRK',
  materialName: 'Brick',
  quantityPerUnit: 8,
  wastagePercentage: 5,
  effectiveQuantityPerUnit: 8.4,
  effectiveDate: '2026-07-01',
  version: 1,
  status: MaterialCoefficientStatus.Draft,
  basedOnStandardId: null,
  submittedBy: null,
  submittedAt: null,
  approvalReference: null,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  notes: null,
};

describe('resolveMaterialCoefficientCapabilities', () => {
  const has = (codes: string[]) => (code: string) => codes.includes(code);

  it('maps exact Nest permission codes', () => {
    const caps = resolveMaterialCoefficientCapabilities(
      has(['material_consumption.view', 'material_consumption.manage']),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canManage).toBe(true);
    expect(caps.canApprove).toBe(false);
  });

  it('does not invent material_coefficient.* aliases', () => {
    const caps = resolveMaterialCoefficientCapabilities(
      has(['material_coefficient.view', 'material_coefficient.manage']),
    );
    expect(caps.canView).toBe(false);
    expect(caps.canManage).toBe(false);
  });
});

describe('resolveMaterialCoefficientActions', () => {
  const viewer = resolveMaterialCoefficientCapabilities(() => false);
  const manager = resolveMaterialCoefficientCapabilities((c) =>
    ['material_consumption.view', 'material_consumption.manage'].includes(c),
  );
  const approver = resolveMaterialCoefficientCapabilities((c) =>
    ['material_consumption.view', 'material_consumption.approve'].includes(c),
  );

  it('manager can edit and submit draft', () => {
    expect(
      resolveMaterialCoefficientActions(baseRow, manager),
    ).toEqual(expect.arrayContaining(['edit', 'submit']));
  });

  it('manager can create version from active', () => {
    const active = {
      ...baseRow,
      status: MaterialCoefficientStatus.Active,
    };
    expect(
      resolveMaterialCoefficientActions(active, manager),
    ).toContain('createVersion');
  });

  it('approver can approve pending', () => {
    const pending = {
      ...baseRow,
      status: MaterialCoefficientStatus.PendingApproval,
    };
    expect(
      resolveMaterialCoefficientActions(pending, approver),
    ).toEqual(expect.arrayContaining(['approve', 'reject']));
  });

  it('viewer has no workflow actions', () => {
    expect(resolveMaterialCoefficientActions(baseRow, viewer)).toEqual([]);
  });
});
