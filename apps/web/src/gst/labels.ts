import {
  GstDirection,
  GstDocumentStatus,
  GstDocumentType,
  GstReturnStatus,
  GstReturnType,
  type GstDirection as Dir,
  type GstDocumentStatus as DocStatus,
  type GstDocumentType as DocType,
  type GstReturnStatus as RetStatus,
  type GstReturnType as RetType,
} from './types';

export function gstDocumentTypeLabel(type: DocType): string {
  switch (type) {
    case GstDocumentType.TaxInvoice:
      return 'Tax invoice';
    case GstDocumentType.DebitNote:
      return 'Debit note';
    case GstDocumentType.CreditNote:
      return 'Credit note';
    case GstDocumentType.BillOfSupply:
      return 'Bill of supply';
    case GstDocumentType.SelfInvoice:
      return 'Self invoice';
    default:
      return type;
  }
}

export function gstDirectionLabel(direction: Dir): string {
  return direction === GstDirection.Inward ? 'Inward' : 'Outward';
}

export function gstDocumentStatusLabel(status: DocStatus): string {
  switch (status) {
    case GstDocumentStatus.Draft:
      return 'Draft';
    case GstDocumentStatus.Posted:
      return 'Posted';
    case GstDocumentStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function gstReturnTypeLabel(type: RetType): string {
  switch (type) {
    case GstReturnType.Gstr1:
      return 'GSTR-1';
    case GstReturnType.Gstr3b:
      return 'GSTR-3B';
    case GstReturnType.Gstr2b:
      return 'GSTR-2B';
    default:
      return type;
  }
}

export function gstReturnStatusLabel(status: RetStatus): string {
  switch (status) {
    case GstReturnStatus.Draft:
      return 'Draft';
    case GstReturnStatus.Computed:
      return 'Computed';
    case GstReturnStatus.Filed:
      return 'Filed';
    case GstReturnStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function gstPeriodLabel(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}
