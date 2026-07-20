import type { VendorInvoiceVarianceSeverity } from './types';

/**
 * Client mirror of Nest `summarizeMatchingStatus` for tests / UI preview.
 * Server tolerances (%) remain authoritative.
 */
export function summarizeMatchingStatusPreview(
  variances: ReadonlyArray<{ severity: string }>,
): 'matched' | 'matched_with_tolerance' | 'exception' {
  if (variances.length === 0) return 'matched';
  if (
    variances.some(
      (v) =>
        v.severity === ('exception' satisfies VendorInvoiceVarianceSeverity),
    )
  ) {
    return 'exception';
  }
  return 'matched_with_tolerance';
}
