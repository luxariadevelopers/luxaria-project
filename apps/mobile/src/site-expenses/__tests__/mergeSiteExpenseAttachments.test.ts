import { mergeSiteExpenseAttachments } from '../mergeSiteExpenseAttachments';
import { SiteExpenseAttachmentType } from '../types';

describe('mergeSiteExpenseAttachments', () => {
  it('maps signature fieldKey into Nest attachments array', () => {
    const merged = mergeSiteExpenseAttachments({
      projectId: '507f1f77bcf86cd799439011',
      amount: 100,
      signature: 'doc-sig',
      attachments: { signature: 'doc-sig' },
      submitAfterCreate: true,
      offlineCapturedAt: '2026-07-20T00:00:00.000Z',
      clientTransactionId: 'txn-1',
      idempotencyKey: 'idem-1',
      deviceTimestamp: '2026-07-20T00:00:00.000Z',
    });

    expect(merged.submitAfterCreate).toBeUndefined();
    expect(merged.clientTransactionId).toBeUndefined();
    expect(merged.signature).toBeUndefined();
    expect(merged.attachments).toEqual([
      {
        type: SiteExpenseAttachmentType.Signature,
        documentId: 'doc-sig',
        fileName: null,
        filePath: null,
        mimeType: null,
      },
    ]);
    expect(merged.amount).toBe(100);
  });
});
