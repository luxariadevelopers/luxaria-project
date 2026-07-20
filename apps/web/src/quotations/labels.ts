import { VendorQuotationStatus } from './types';

export function quotationStatusLabel(status: string): string {
  switch (status) {
    case VendorQuotationStatus.Draft:
      return 'Draft';
    case VendorQuotationStatus.Submitted:
      return 'Submitted';
    case VendorQuotationStatus.Final:
      return 'Final';
    case VendorQuotationStatus.Superseded:
      return 'Superseded';
    case VendorQuotationStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function materialUnitLabel(unit: string): string {
  return unit.replaceAll('_', ' ');
}
