import { describe, expect, it } from 'vitest';
import type { GrnCapabilities } from './roleAccess';
import { GoodsReceiptStatus } from './types';
import { resolveGrnRowActions } from './workflowActions';

const fullCaps: GrnCapabilities = {
  canView: true,
  canQc: true,
  canAccept: true,
  canPost: true,
  canCreate: true,
  canCancel: true,
  canViewPurchaseOrder: true,
  canDownloadDocuments: true,
};

describe('resolveGrnRowActions', () => {
  it('offers QC and accept on submitted', () => {
    expect(
      resolveGrnRowActions(
        { status: GoodsReceiptStatus.Submitted },
        fullCaps,
      ),
    ).toEqual(['quality_check', 'accept']);
  });

  it('offers accept on quality_check', () => {
    expect(
      resolveGrnRowActions(
        { status: GoodsReceiptStatus.QualityCheck },
        fullCaps,
      ),
    ).toEqual(['accept']);
  });

  it('offers post on partially accepted', () => {
    expect(
      resolveGrnRowActions(
        { status: GoodsReceiptStatus.PartiallyAccepted },
        fullCaps,
      ),
    ).toEqual(['post']);
  });

  it('offers post on fully accepted', () => {
    expect(
      resolveGrnRowActions(
        { status: GoodsReceiptStatus.Accepted },
        fullCaps,
      ),
    ).toEqual(['post']);
  });

  it('offers nothing when posted', () => {
    expect(
      resolveGrnRowActions({ status: GoodsReceiptStatus.Posted }, fullCaps),
    ).toEqual([]);
  });

  it('hides approve actions without grn.approve', () => {
    const viewOnly: GrnCapabilities = {
      ...fullCaps,
      canQc: false,
      canAccept: false,
      canPost: false,
    };
    expect(
      resolveGrnRowActions(
        { status: GoodsReceiptStatus.Submitted },
        viewOnly,
      ),
    ).toEqual([]);
  });
});
