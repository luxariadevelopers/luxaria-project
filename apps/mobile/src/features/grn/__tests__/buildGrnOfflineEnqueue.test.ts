import { buildGrnOfflineEnqueue } from '../buildGrnOfflineEnqueue';

describe('buildGrnOfflineEnqueue', () => {
  const base = {
    projectId: 'proj-1',
    purchaseOrderId: 'po-1',
    vendorId: 'ven-1',
    receivedDate: '2026-07-17',
    latitude: 13.08,
    longitude: 80.27,
    items: [
      {
        materialId: 'mat-1',
        purchaseOrderLineId: 'line-1',
        orderedQuantity: 100,
        receivedQuantity: 90,
        unit: 'bag',
      },
    ],
    photos: [
      {
        uri: 'file:///photo1.jpg',
        name: 'photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1200,
      },
    ],
  };

  it('builds offline GRN enqueue with submit flag and media field keys', () => {
    const enqueue = buildGrnOfflineEnqueue({
      ...base,
      purchaseOrderNumber: 'PO-2026-000001',
      challanDocument: {
        uri: 'file:///challan.pdf',
        name: 'challan.pdf',
        mimeType: 'application/pdf',
      },
    });

    expect(enqueue.type).toBe('grn.create');
    expect(enqueue.endpoint).toBe('/goods-receipts');
    expect(enqueue.payload.submit).toBe(true);
    expect(enqueue.payload.latitude).toBe(13.08);
    expect(enqueue.media?.[0]?.fieldKey).toBe('photo_0');
    expect(enqueue.media?.some((m) => m.fieldKey === 'challanDocument')).toBe(
      true,
    );
  });

  it('requires photos, GPS, and positive received qty', () => {
    expect(() =>
      buildGrnOfflineEnqueue({ ...base, photos: [] }),
    ).toThrow(/photo/);
    expect(() =>
      buildGrnOfflineEnqueue({ ...base, latitude: Number.NaN }),
    ).toThrow(/GPS/);
    expect(() =>
      buildGrnOfflineEnqueue({
        ...base,
        items: [{ ...base.items[0]!, receivedQuantity: 0 }],
      }),
    ).toThrow(/receivedQuantity/);
  });
});
