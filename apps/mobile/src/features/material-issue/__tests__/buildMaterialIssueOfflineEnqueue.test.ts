import {
  buildMaterialIssueOfflineEnqueue,
  MATERIAL_ISSUE_OFFLINE_TYPE,
} from '../buildMaterialIssueOfflineEnqueue';
import { MaterialUnit } from '../types';

describe('buildMaterialIssueOfflineEnqueue', () => {
  const base = {
    projectId: '507f1f77bcf86cd799439011',
    issueDate: '2026-07-20',
    receivedBy: '507f1f77bcf86cd799439012',
    boqItemId: '507f1f77bcf86cd799439013',
    workLocation: 'Block A – Column casting',
    items: [
      {
        materialId: '507f1f77bcf86cd799439014',
        quantity: 10,
        unit: MaterialUnit.Bag,
        batch: 'B-01',
        notes: null,
      },
    ],
  };

  it('builds draft create enqueue without media or submitAfterCreate', () => {
    const enqueue = buildMaterialIssueOfflineEnqueue(base);
    expect(enqueue.type).toBe(MATERIAL_ISSUE_OFFLINE_TYPE);
    expect(enqueue.endpoint).toBe('/material-issues');
    expect(enqueue.method).toBe('POST');
    expect(enqueue.payload.projectId).toBe(base.projectId);
    expect(enqueue.payload.items).toEqual([
      {
        materialId: base.items[0]!.materialId,
        quantity: 10,
        unit: MaterialUnit.Bag,
        batch: 'B-01',
        notes: null,
      },
    ]);
    expect(enqueue.payload.submitAfterCreate).toBeUndefined();
    expect(enqueue.media).toBeUndefined();
    expect(enqueue.payload.offlineCapturedAt).toEqual(expect.any(String));
  });

  it('rejects invalid quantity', () => {
    expect(() =>
      buildMaterialIssueOfflineEnqueue({
        ...base,
        items: [{ ...base.items[0]!, quantity: 0 }],
      }),
    ).toThrow(/greater than 0/i);
  });

  it('requires at least one line', () => {
    expect(() =>
      buildMaterialIssueOfflineEnqueue({ ...base, items: [] }),
    ).toThrow(/material line/i);
  });
});
