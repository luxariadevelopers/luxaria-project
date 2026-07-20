import { describe, expect, it } from 'vitest';
import { resolveMaterialIssueCapabilities } from './roleAccess';
import {
  MaterialIssueStatus,
  MaterialUnit,
  type PublicMaterialIssue,
} from './types';
import { resolveMaterialIssueRowActions } from './workflowActions';

function issue(
  overrides: Partial<PublicMaterialIssue> = {},
): PublicMaterialIssue {
  return {
    id: '507f1f77bcf86cd799439011',
    issueNumber: 'MI-2026-000001',
    projectId: '507f1f77bcf86cd799439012',
    issueDate: '2026-07-20',
    issuedBy: 'u1',
    receivedBy: 'u2',
    contractorId: null,
    blockId: null,
    floorId: null,
    boqItemId: '507f1f77bcf86cd799439013',
    workLocation: 'Block A',
    storeLocation: 'Main Store',
    items: [
      {
        id: 'i1',
        materialId: 'm1',
        materialCode: 'CEM',
        materialName: 'Cement',
        unit: MaterialUnit.Bag,
        quantity: 10,
        baseUnit: MaterialUnit.Bag,
        baseUnitQuantity: 10,
        returnedBaseQuantity: 0,
        remainingBaseQuantity: 10,
        batch: null,
        notes: null,
        stockLedgerEntryId: null,
      },
    ],
    signatures: {
      recipientSignatureDocumentId: null,
      recipientSignatureChecksum: null,
      issuerSignatureDocumentId: null,
      issuerSignatureChecksum: null,
      recipientSignedAt: null,
    },
    status: MaterialIssueStatus.Draft,
    returns: [],
    notes: null,
    submittedBy: null,
    submittedAt: null,
    confirmedBy: null,
    confirmedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    ...overrides,
  };
}

const fullCaps = resolveMaterialIssueCapabilities(() => true);

describe('resolveMaterialIssueRowActions', () => {
  it('gates draft submit / signature / cancel', () => {
    const actions = resolveMaterialIssueRowActions(issue(), fullCaps);
    expect(actions).toContain('submit');
    expect(actions).toContain('attach_signature');
    expect(actions).toContain('cancel');
    expect(actions).not.toContain('confirm');
    expect(actions).not.toContain('return');
  });

  it('allows confirm only when submitted + stock.adjust', () => {
    const actions = resolveMaterialIssueRowActions(
      issue({ status: MaterialIssueStatus.Submitted }),
      fullCaps,
    );
    expect(actions).toContain('confirm');
    expect(actions).toContain('cancel');
  });

  it('allows return only when confirmed with remaining qty', () => {
    const actions = resolveMaterialIssueRowActions(
      issue({ status: MaterialIssueStatus.Confirmed }),
      fullCaps,
    );
    expect(actions).toContain('return');
    expect(actions).not.toContain('confirm');
  });
});
