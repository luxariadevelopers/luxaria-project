import {
  PurchaseOrderStatus,
  SignedPaymentVoucherStatus,
} from '@luxaria/shared-types';
import {
  exportAccountingReportPdf,
  exportConstructionReportPdf,
  exportPurchaseOrderPdf,
  exportQuotationComparisonPdf,
  regenerateCustomerReceiptPdf,
  regenerateDprPdf,
  type ReportExportQuery,
} from './api';
import type { PdfActionSource } from './types';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function isObjectId(value: string | null | undefined): value is string {
  return Boolean(value && OBJECT_ID_RE.test(value));
}

/**
 * Signed payment voucher — PDF stored as documents module id on approve.
 * `GET /documents/:id/download-url` + `document.download`.
 * Entity view: `payment.view`.
 */
export function signedPaymentVoucherPdfSource(input: {
  voucherPdfDocumentId: string | null;
  status: string;
  label?: string;
}): PdfActionSource {
  const pdfReady = [
    SignedPaymentVoucherStatus.Approved,
    SignedPaymentVoucherStatus.Posted,
  ] as const;

  if (!input.voucherPdfDocumentId) {
    return {
      kind: 'unavailable',
      label: input.label ?? 'Voucher PDF',
      reason:
        'Voucher PDF is created on approve. Approve the voucher before download.',
    };
  }

  if (!pdfReady.includes(input.status as (typeof pdfReady)[number])) {
    return {
      kind: 'unavailable',
      label: input.label ?? 'Voucher PDF',
      reason: `Voucher PDF is only available when status is ${pdfReady.join(' or ')}.`,
    };
  }

  return {
    kind: 'document',
    label: input.label ?? 'Voucher PDF',
    documentId: input.voucherPdfDocumentId,
    requiresDocumentDownload: true,
  };
}

/**
 * DPR — `pdfDocumentId` after submit; regenerate via
 * `POST /daily-progress-reports/:id/regenerate-pdf` (`dpr.review`).
 * Download still needs `document.download`. Entity view: `dpr.view`.
 */
export function dprPdfSource(input: {
  id: string;
  pdfDocumentId: string | null;
  status: string;
  label?: string;
}): PdfActionSource {
  /** Backend regeneratePdf allows submitted | reviewed only. */
  const allowedStatuses = ['submitted', 'reviewed'] as const;

  if (!allowedStatuses.includes(input.status as (typeof allowedStatuses)[number])) {
    return {
      kind: 'unavailable',
      label: input.label ?? 'DPR PDF',
      reason:
        'DPR PDF is available after submit (submitted or reviewed).',
    };
  }

  return {
    kind: 'generate-document',
    label: input.label ?? 'DPR PDF',
    documentId: input.pdfDocumentId,
    status: input.status,
    allowedStatuses,
    requiresDocumentDownload: true,
    generate: () => regenerateDprPdf(input.id),
  };
}

/**
 * Purchase order — `POST /purchase-orders/:id/export-pdf` (`purchase.view`).
 * Returns filesystem `downloadPath` under `uploads/purchase-orders/…`.
 */
export function purchaseOrderPdfSource(input: {
  id: string;
  pdfPath: string | null;
  status: string;
  label?: string;
}): PdfActionSource {
  /** Backend exportPdf has no status gate; skip cancelled/superseded in UI. */
  const blocked: readonly string[] = [
    PurchaseOrderStatus.Cancelled,
    PurchaseOrderStatus.Superseded,
  ];
  if (blocked.includes(input.status)) {
    return {
      kind: 'unavailable',
      label: input.label ?? 'Purchase order PDF',
      reason: `PDF export is not offered for ${input.status} purchase orders.`,
    };
  }

  return {
    kind: 'generate-path',
    label: input.label ?? 'Purchase order PDF',
    downloadPath: input.pdfPath,
    status: input.status,
    requiresDocumentDownload: true,
    generate: () => exportPurchaseOrderPdf(input.id),
  };
}

/**
 * Customer receipt — regenerate when posted:
 * `POST /customer-receipts/:id/regenerate-pdf` (`collection.view`).
 */
export function customerReceiptPdfSource(input: {
  id: string;
  receiptPdfPath: string | null;
  status: string;
  label?: string;
}): PdfActionSource {
  /** Backend regeneratePdf requires Posted. */
  const allowedStatuses = ['posted'] as const;
  if (input.status !== 'posted' && !input.receiptPdfPath) {
    return {
      kind: 'unavailable',
      label: input.label ?? 'Receipt PDF',
      reason: 'Receipt PDF is available after the receipt is posted.',
    };
  }

  return {
    kind: 'generate-path',
    label: input.label ?? 'Receipt PDF',
    downloadPath: input.receiptPdfPath,
    status: input.status,
    allowedStatuses: input.receiptPdfPath ? undefined : allowedStatuses,
    requiresDocumentDownload: true,
    generate: () => regenerateCustomerReceiptPdf(input.id),
  };
}

/**
 * Quotation comparison — `POST /quotation-comparisons/:id/export-pdf`
 * (`quotation.compare`).
 */
export function quotationComparisonPdfSource(input: {
  id: string;
  pdfPath: string | null;
  label?: string;
}): PdfActionSource {
  return {
    kind: 'generate-path',
    label: input.label ?? 'Comparison PDF',
    downloadPath: input.pdfPath,
    requiresDocumentDownload: true,
    generate: () => exportQuotationComparisonPdf(input.id),
  };
}

/**
 * GRN has no export-pdf route. When photo/challan/weighbridge fields hold
 * document ObjectIds, download via documents API (`document.download`).
 * Entity access: `grn.create` (list/get permission on goods-receipts).
 */
export function goodsReceiptPdfSource(input: {
  photos: readonly string[];
  challanDocument: string | null;
  weighbridgeDocument: string | null;
  label?: string;
}): PdfActionSource {
  const candidates = [
    input.challanDocument,
    input.weighbridgeDocument,
    ...input.photos,
  ];
  const documentId = candidates.find(isObjectId) ?? null;

  if (!documentId) {
    return {
      kind: 'unavailable',
      label: input.label ?? 'GRN documents',
      reason:
        'Goods receipts have no PDF export endpoint. Attach document ids (photos / challan / weighbridge) to preview or download.',
    };
  }

  return {
    kind: 'document',
    label: input.label ?? 'GRN documents',
    documentId,
    requiresDocumentDownload: true,
  };
}

/** Accounting report PDF export — `report.export`. */
export function accountingReportPdfSource(input: {
  reportType: string;
  query?: ReportExportQuery;
  label?: string;
}): PdfActionSource {
  return {
    kind: 'report-blob',
    label: input.label ?? 'Accounting report PDF',
    exportPermission: 'report.export',
    fetch: () => exportAccountingReportPdf(input.reportType, input.query ?? {}),
  };
}

/** Construction report PDF export — `report.export`. */
export function constructionReportPdfSource(input: {
  reportType: string;
  query?: ReportExportQuery;
  label?: string;
}): PdfActionSource {
  return {
    kind: 'report-blob',
    label: input.label ?? 'Construction report PDF',
    exportPermission: 'report.export',
    fetch: () =>
      exportConstructionReportPdf(input.reportType, input.query ?? {}),
  };
}
