import type { QuotationCapabilities } from './roleAccess';
import { VendorQuotationStatus, type PublicVendorQuotation } from './types';

export type QuotationRowActionId =
  | 'edit'
  | 'submit'
  | 'revise'
  | 'finalise'
  | 'cancel'
  | 'upload'
  | 'create_po';

export type QuotationRowActionExtras = {
  /** Nest `purchase.order` — open PO create from approved sourcing. */
  canCreatePurchaseOrder?: boolean;
};

/**
 * Status + permission gate for list / entry actions.
 * Nest still enforces transitions.
 */
export function resolveQuotationRowActions(
  row: PublicVendorQuotation,
  caps: QuotationCapabilities,
  extras: QuotationRowActionExtras = {},
): QuotationRowActionId[] {
  const actions: QuotationRowActionId[] = [];

  if (row.status === VendorQuotationStatus.Draft && caps.canManage) {
    actions.push('edit', 'submit', 'upload', 'cancel');
  }
  if (
    (row.status === VendorQuotationStatus.Submitted ||
      row.status === VendorQuotationStatus.Final) &&
    caps.canManage
  ) {
    actions.push('revise');
  }
  if (row.status === VendorQuotationStatus.Submitted && caps.canFinalize) {
    actions.push('finalise');
  }
  if (row.status === VendorQuotationStatus.Submitted && caps.canManage) {
    actions.push('cancel');
  }
  if (
    extras.canCreatePurchaseOrder &&
    (row.status === VendorQuotationStatus.Submitted ||
      row.status === VendorQuotationStatus.Final)
  ) {
    actions.push('create_po');
  }

  return actions;
}
