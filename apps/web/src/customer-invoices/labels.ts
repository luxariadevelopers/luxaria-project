import {
  CustomerInvoiceStatus,
  type CustomerInvoiceStatus as Status,
} from './types';

export function customerInvoiceStatusLabel(status: Status): string {
  switch (status) {
    case CustomerInvoiceStatus.Draft:
      return 'Draft';
    case CustomerInvoiceStatus.Posted:
      return 'Posted';
    case CustomerInvoiceStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}
