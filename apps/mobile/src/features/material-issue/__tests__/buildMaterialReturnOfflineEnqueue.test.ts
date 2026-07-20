import { buildMaterialReturnOfflineEnqueue } from '../buildMaterialReturnOfflineEnqueue';
import { MaterialUnit } from '../types';

describe('buildMaterialReturnOfflineEnqueue', () => {
  const base = {
    projectId: 'proj-1',
    issueId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    issueNumber: 'MI-2026-000001',
    returnDate: '2026-07-20',
    returnedBy: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    items: [
      {
        materialId: 'cccccccccccccccccccccccc',
        materialLabel: 'CEM-001',
        quantity: 2,
        unit: MaterialUnit.Bag,
        reason: 'Leftover',
        remainingBaseQuantity: 5,
      },
    ],
    photos: [
      {
        uri: 'file:///return1.jpg',
        name: 'return1.jpg',
        mimeType: 'image/jpeg',
        size: 900,
      },
    ],
  };

  it('builds offline return enqueue with Nest return path', () => {
    const enqueue = buildMaterialReturnOfflineEnqueue(base);
    expect(enqueue.type).toBe('material_return.create');
    expect(enqueue.endpoint).toBe(
      '/material-issues/aaaaaaaaaaaaaaaaaaaaaaaa/returns',
    );
    expect(enqueue.method).toBe('POST');
    expect(enqueue.payload.returnDate).toBe('2026-07-20');
    expect(enqueue.payload.returnedBy).toBe('bbbbbbbbbbbbbbbbbbbbbbbb');
    expect(enqueue.media?.[0]?.fieldKey).toBe('photo_0');
    expect(enqueue.media?.[0]?.uploadMeta?.documentType).toBe('return_photo');
  });

  it('rejects quantity above remaining outstanding', () => {
    expect(() =>
      buildMaterialReturnOfflineEnqueue({
        ...base,
        items: [
          {
            ...base.items[0]!,
            quantity: 9,
            remainingBaseQuantity: 5,
          },
        ],
      }),
    ).toThrow(/exceeds remaining/);
  });

  it('requires photos and at least one line', () => {
    expect(() =>
      buildMaterialReturnOfflineEnqueue({ ...base, photos: [] }),
    ).toThrow(/photo/);
    expect(() =>
      buildMaterialReturnOfflineEnqueue({ ...base, items: [] }),
    ).toThrow(/return line/);
  });
});
