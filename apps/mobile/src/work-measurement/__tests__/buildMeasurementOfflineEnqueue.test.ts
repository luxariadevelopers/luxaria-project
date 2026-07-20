import { buildMeasurementOfflineEnqueue } from '../buildMeasurementOfflineEnqueue';

const photo = {
  uri: 'file:///wm-photo1.jpg',
  name: 'wm-photo1.jpg',
  mimeType: 'image/jpeg',
  size: 2048,
};

const base = {
  projectId: '507f1f77bcf86cd799439011',
  contractorId: '507f1f77bcf86cd799439012',
  boqItemId: '507f1f77bcf86cd799439013',
  boqCode: 'A.1.01',
  location: 'Block A / Floor 2',
  measurementDate: '2026-07-20',
  currentQuantity: 12.5,
  previousQuantity: 40,
  boqPlannedQuantity: 100,
  unit: 'cum',
  photos: [photo],
};

describe('buildMeasurementOfflineEnqueue', () => {
  it('builds offline create+submit enqueue with photo media keys', () => {
    const enqueue = buildMeasurementOfflineEnqueue({
      ...base,
      drawingReference: 'DWG-A-101',
      notes: 'Slab pour complete',
    });

    expect(enqueue.type).toBe('work_measurement.create');
    expect(enqueue.endpoint).toBe('/work-measurements');
    expect(enqueue.method).toBe('POST');
    expect(enqueue.payload.submit).toBe(true);
    expect(enqueue.payload.projectId).toBe(base.projectId);
    expect(enqueue.payload.contractorId).toBe(base.contractorId);
    expect(enqueue.payload.boqItemId).toBe(base.boqItemId);
    expect(enqueue.payload.location).toBe(base.location);
    expect(enqueue.payload.currentQuantity).toBe(12.5);
    expect(enqueue.payload.drawingReference).toBe('DWG-A-101');
    expect(enqueue.payload.photoDocumentIds).toEqual([]);
    expect(enqueue.media?.[0]?.fieldKey).toBe('photo_0');
    expect(enqueue.media?.[0]?.uploadMeta).toMatchObject({
      entityType: 'work_measurement',
      documentType: 'measurement_photo',
    });
    expect(enqueue.label).toContain('A.1.01');
  });

  it('supports offline capture without network (queue payload only)', () => {
    const enqueue = buildMeasurementOfflineEnqueue(base);
    // No HTTP — caller enqueues locally; sync uploads media then POSTs.
    expect(enqueue.payload.offlineCapturedAt).toEqual(expect.any(String));
    expect(enqueue.payload.clientPreviousQuantity).toBe(40);
    expect(enqueue.payload.clientBoqPlannedQuantity).toBe(100);
  });

  it('rejects over-BOQ conflict before enqueue', () => {
    expect(() =>
      buildMeasurementOfflineEnqueue({
        ...base,
        previousQuantity: 95,
        currentQuantity: 10,
        boqPlannedQuantity: 100,
      }),
    ).toThrow(/exceeds BOQ/);
  });

  it('requires evidence photos', () => {
    expect(() =>
      buildMeasurementOfflineEnqueue({ ...base, photos: [] }),
    ).toThrow(/photo/i);
  });

  it('requires location and valid ids', () => {
    expect(() =>
      buildMeasurementOfflineEnqueue({ ...base, location: '   ' }),
    ).toThrow(/Location/);
    expect(() =>
      buildMeasurementOfflineEnqueue({ ...base, contractorId: 'bad' }),
    ).toThrow(/contractor/);
  });
});
