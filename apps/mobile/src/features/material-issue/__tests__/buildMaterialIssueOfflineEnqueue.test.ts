import {
  buildMaterialIssueOfflineEnqueue,
  MATERIAL_ISSUE_ISSUER_SIG_FIELD,
  MATERIAL_ISSUE_OFFLINE_TYPE,
  MATERIAL_ISSUE_RECIPIENT_SIG_FIELD,
} from '../buildMaterialIssueOfflineEnqueue';
import { MaterialUnit } from '../types';

const checksumA = 'a'.repeat(64);
const checksumB = 'b'.repeat(64);

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
    recipientSignature: {
      uri: 'file:///tmp/recipient.png',
      name: 'recipient.png',
      mimeType: 'image/png',
      size: 1200,
    },
    recipientSignatureChecksum: checksumA,
  };

  it('builds create+submit enqueue with recipient signature media', () => {
    const enqueue = buildMaterialIssueOfflineEnqueue(base);
    expect(enqueue.type).toBe(MATERIAL_ISSUE_OFFLINE_TYPE);
    expect(enqueue.endpoint).toBe('/material-issues');
    expect(enqueue.method).toBe('POST');
    expect(enqueue.payload.projectId).toBe(base.projectId);
    expect(enqueue.payload.submitAfterCreate).toBe(true);
    expect(enqueue.payload.recipientSignatureChecksum).toBe(checksumA);
    expect(enqueue.payload.items).toEqual([
      {
        materialId: base.items[0]!.materialId,
        quantity: 10,
        unit: MaterialUnit.Bag,
        batch: 'B-01',
        notes: null,
      },
    ]);
    expect(enqueue.media).toHaveLength(1);
    expect(enqueue.media?.[0]?.fieldKey).toBe(MATERIAL_ISSUE_RECIPIENT_SIG_FIELD);
    expect(enqueue.media?.[0]?.uploadMeta).toMatchObject({
      module: 'material_issues',
      entityType: 'material_issue',
      entityId: base.projectId,
      documentType: 'signature',
      checksum: checksumA,
    });
    expect(enqueue.payload.offlineCapturedAt).toEqual(expect.any(String));
  });

  it('includes optional issuer signature media + checksum', () => {
    const enqueue = buildMaterialIssueOfflineEnqueue({
      ...base,
      issuerSignature: {
        uri: 'file:///tmp/issuer.png',
        name: 'issuer.png',
        mimeType: 'image/png',
      },
      issuerSignatureChecksum: checksumB,
    });
    expect(enqueue.media).toHaveLength(2);
    expect(enqueue.media?.some((m) => m.fieldKey === MATERIAL_ISSUE_ISSUER_SIG_FIELD)).toBe(
      true,
    );
    expect(enqueue.payload.issuerSignatureChecksum).toBe(checksumB);
  });

  it('rejects missing recipient signature', () => {
    expect(() =>
      buildMaterialIssueOfflineEnqueue({
        ...base,
        recipientSignature: {
          uri: '',
          name: 'x.png',
          mimeType: 'image/png',
        },
      }),
    ).toThrow(/Recipient signature/i);
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
