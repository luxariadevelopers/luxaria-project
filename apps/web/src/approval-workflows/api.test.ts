import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchApprovalWorkflow,
  upsertApprovalWorkflow,
} from './api';

const apiGet = vi.fn();
const apiPut = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPut: (...args: unknown[]) => apiPut(...args),
}));

const sampleWorkflow = {
  id: 'w1',
  module: 'procurement',
  entityType: 'purchase_order',
  name: 'Purchase order approval',
  isActive: true,
  allowSelfApprove: false,
  steps: [
    {
      stepNumber: 1,
      roleIds: ['507f1f77bcf86cd799439011'],
      specificUserIds: [],
      minimumAmount: 0,
      maximumAmount: null,
      requiresAll: false,
      escalationHours: null,
      fallbackRole: null,
    },
  ],
};

describe('approval workflow API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPut.mockReset();
  });

  it('loads an active workflow', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: sampleWorkflow,
    });

    const result = await fetchApprovalWorkflow('procurement', 'purchase_order');

    expect(apiGet).toHaveBeenCalledWith(
      '/approval-workflows/procurement/purchase_order',
    );
    expect(result?.id).toBe('w1');
    expect(result?.steps[0]?.roleIds).toEqual([
      '507f1f77bcf86cd799439011',
    ]);
  });

  it('returns null when workflow is missing', async () => {
    apiGet.mockRejectedValue(
      Object.assign(new Error('Not found'), {
        isAxiosError: true,
        response: { status: 404 },
      }),
    );
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const result = await fetchApprovalWorkflow('sales', 'booking_discount');

    expect(result).toBeNull();
  });

  it('upserts workflow definitions', async () => {
    apiPut.mockResolvedValue({
      success: true,
      message: 'Approval workflow updated',
      data: sampleWorkflow,
    });

    const result = await upsertApprovalWorkflow({
      module: 'procurement',
      entityType: 'purchase_order',
      name: 'Purchase order approval',
      allowSelfApprove: false,
      steps: [
        {
          stepNumber: 1,
          roleIds: ['507f1f77bcf86cd799439011'],
        },
      ],
    });

    expect(apiPut).toHaveBeenCalledWith('/approval-workflows', {
      module: 'procurement',
      entityType: 'purchase_order',
      name: 'Purchase order approval',
      allowSelfApprove: false,
      steps: [
        {
          stepNumber: 1,
          roleIds: ['507f1f77bcf86cd799439011'],
        },
      ],
    });
    expect(result.message).toBe('Approval workflow updated');
    expect(result.workflow.module).toBe('procurement');
  });
});
