import { BadRequestException } from '@nestjs/common';
import {
  assertGps,
  assertPhotos,
  assertQualityDecision,
  assertReceivedQuantities,
  mergePhotoIds,
} from './goods-receipts.validation';

describe('goods-receipts.validation', () => {
  it('requires photos and valid GPS', () => {
    expect(() => assertPhotos([])).toThrow(/photo/);
    expect(() => assertGps(91, 0)).toThrow(/latitude/);
    expect(() => assertGps(13, 80)).not.toThrow();
  });

  it('enforces receive tolerance vs ordered qty', () => {
    expect(() =>
      assertReceivedQuantities({
        orderedQuantity: 100,
        receivedQuantity: 106,
        tolerancePercent: 5,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertReceivedQuantities({
        orderedQuantity: 100,
        receivedQuantity: 105,
        tolerancePercent: 5,
      }),
    ).not.toThrow();
  });

  it('requires accepted + rejected = received and reason on reject', () => {
    expect(() =>
      assertQualityDecision({
        receivedQuantity: 100,
        acceptedQuantity: 90,
        rejectedQuantity: 5,
      }),
    ).toThrow(/must equal/);

    expect(() =>
      assertQualityDecision({
        receivedQuantity: 100,
        acceptedQuantity: 90,
        rejectedQuantity: 10,
        rejectionReason: 'ab',
      }),
    ).toThrow(/rejectionReason/);

    expect(() =>
      assertQualityDecision({
        receivedQuantity: 100,
        acceptedQuantity: 90,
        rejectedQuantity: 10,
        rejectionReason: 'Damaged bags',
      }),
    ).not.toThrow();
  });

  it('merges photo ids from attachments', () => {
    expect(
      mergePhotoIds({
        photos: ['doc-a'],
        attachments: { photo_0: 'doc-b', challanDocument: 'challan' },
      }),
    ).toEqual(['doc-a', 'doc-b']);
  });
});
