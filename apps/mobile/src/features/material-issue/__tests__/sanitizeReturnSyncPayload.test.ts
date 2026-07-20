import {
  isMaterialReturnEndpoint,
  toCreateMaterialReturnBody,
} from '../sanitizeReturnSyncPayload';
import { MaterialUnit } from '../types';

describe('sanitizeReturnSyncPayload', () => {
  it('detects material return endpoints', () => {
    expect(
      isMaterialReturnEndpoint('/material-issues/abc123/returns'),
    ).toBe(true);
    expect(isMaterialReturnEndpoint('/goods-receipts')).toBe(false);
  });

  it('strips offline envelope fields and folds photos into notes', () => {
    const body = toCreateMaterialReturnBody({
      returnDate: '2026-07-20',
      returnedBy: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      notes: 'Site unused cement',
      items: [
        {
          materialId: 'cccccccccccccccccccccccc',
          quantity: 2,
          unit: MaterialUnit.Bag,
          reason: 'Leftover',
        },
      ],
      attachments: {
        photo_0: 'dddddddddddddddddddddddd',
        photo_1: 'eeeeeeeeeeeeeeeeeeeeeeee',
      },
      photo_0: 'dddddddddddddddddddddddd',
      clientTransactionId: 'txn-1',
      idempotencyKey: 'idem-1',
      deviceTimestamp: '2026-07-20T10:00:00.000Z',
    });

    expect(body).toEqual({
      returnDate: '2026-07-20',
      returnedBy: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      notes:
        'Site unused cement\nphotoDocumentIds: dddddddddddddddddddddddd,eeeeeeeeeeeeeeeeeeeeeeee',
      items: [
        {
          materialId: 'cccccccccccccccccccccccc',
          quantity: 2,
          unit: MaterialUnit.Bag,
          reason: 'Leftover',
        },
      ],
    });
    expect(body).not.toHaveProperty('attachments');
    expect(body).not.toHaveProperty('clientTransactionId');
  });
});
