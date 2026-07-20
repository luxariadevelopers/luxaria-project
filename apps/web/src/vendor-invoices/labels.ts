import {
  vendorInvoiceMatchingStatusCatalog,
  vendorInvoiceStatusCatalog,
} from '@/status';
import {
  VendorInvoiceVarianceSeverity,
  VendorInvoiceVarianceType,
} from './types';

export function invoiceStatusLabel(status: string): string {
  return vendorInvoiceStatusCatalog.label(status, status);
}

export function matchingStatusLabel(status: string): string {
  return vendorInvoiceMatchingStatusCatalog.label(status, status);
}

const VARIANCE_TYPE_LABELS: Record<VendorInvoiceVarianceType, string> = {
  material: 'Material',
  quantity: 'Quantity',
  rate: 'Rate',
  tax: 'Tax',
  freight: 'Freight',
  discount: 'Discount',
  total: 'Total',
  amount: 'Amount',
};

export function varianceTypeLabel(type: string): string {
  return VARIANCE_TYPE_LABELS[type as VendorInvoiceVarianceType] ?? type;
}

const SEVERITY_LABELS: Record<VendorInvoiceVarianceSeverity, string> = {
  info: 'Info',
  warning: 'Within tolerance',
  exception: 'Exception',
};

export function varianceSeverityLabel(severity: string): string {
  return SEVERITY_LABELS[severity as VendorInvoiceVarianceSeverity] ?? severity;
}
