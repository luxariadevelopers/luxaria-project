import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient } from '@/api/client';

type PathPdfPayload = {
  downloadPath?: string | null;
  pdfPath?: string | null;
  receiptPdfPath?: string | null;
};

type DocumentPdfPayload = {
  pdfDocumentId?: string | null;
  voucherPdfDocumentId?: string | null;
};

function requirePath(data: PathPdfPayload | undefined, label: string): string {
  const path =
    data?.downloadPath?.trim() ||
    data?.pdfPath?.trim() ||
    data?.receiptPdfPath?.trim();
  if (!path) {
    throw new Error(`${label}: response missing downloadPath/pdfPath`);
  }
  return path;
}

function requireDocumentId(
  data: DocumentPdfPayload | undefined,
  field: keyof DocumentPdfPayload,
  label: string,
): string {
  const id = data?.[field]?.trim();
  if (!id) {
    throw new Error(`${label}: response missing ${field}`);
  }
  return id;
}

/** `POST /purchase-orders/:id/export-pdf` — permission `purchase.view` */
export async function exportPurchaseOrderPdf(id: string): Promise<{
  downloadPath: string;
}> {
  const { data } = await apiClient.post<ApiResponse<PathPdfPayload>>(
    `/purchase-orders/${id}/export-pdf`,
  );
  return { downloadPath: requirePath(data.data, 'Purchase order PDF') };
}

/** `POST /quotation-comparisons/:id/export-pdf` — permission `quotation.compare` */
export async function exportQuotationComparisonPdf(id: string): Promise<{
  downloadPath: string;
}> {
  const { data } = await apiClient.post<ApiResponse<PathPdfPayload>>(
    `/quotation-comparisons/${id}/export-pdf`,
  );
  return { downloadPath: requirePath(data.data, 'Quotation comparison PDF') };
}

/** `POST /customer-receipts/:id/regenerate-pdf` — permission `collection.view` */
export async function regenerateCustomerReceiptPdf(id: string): Promise<{
  downloadPath: string;
}> {
  const { data } = await apiClient.post<ApiResponse<PathPdfPayload>>(
    `/customer-receipts/${id}/regenerate-pdf`,
  );
  return { downloadPath: requirePath(data.data, 'Customer receipt PDF') };
}

/** `POST /daily-progress-reports/:id/regenerate-pdf` — permission `dpr.review` */
export async function regenerateDprPdf(id: string): Promise<{
  documentId: string;
}> {
  const { data } = await apiClient.post<ApiResponse<DocumentPdfPayload>>(
    `/daily-progress-reports/${id}/regenerate-pdf`,
  );
  return {
    documentId: requireDocumentId(data.data, 'pdfDocumentId', 'DPR PDF'),
  };
}

export type ReportExportQuery = {
  financialYearId?: string;
  projectId?: string;
  from?: string;
  to?: string;
  accountId?: string;
  partyId?: string;
};

async function exportReportBlob(
  basePath: 'accounting-reports' | 'construction-reports',
  reportType: string,
  query: ReportExportQuery,
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get<Blob>(
    `/${basePath}/${reportType}/export`,
    {
      params: { ...query, format: 'pdf' },
      responseType: 'blob',
    },
  );
  const disposition = response.headers['content-disposition'];
  const filename =
    parseFilename(disposition) ?? `${reportType}.pdf`;
  return { blob: response.data, filename };
}

/** `GET /accounting-reports/:reportType/export?format=pdf` — `report.export` */
export function exportAccountingReportPdf(
  reportType: string,
  query: ReportExportQuery = {},
) {
  return exportReportBlob('accounting-reports', reportType, query);
}

/** `GET /construction-reports/:reportType/export?format=pdf` — `report.export` */
export function exportConstructionReportPdf(
  reportType: string,
  query: ReportExportQuery = {},
) {
  return exportReportBlob('construction-reports', reportType, query);
}

function parseFilename(disposition: unknown): string | null {
  if (typeof disposition !== 'string') return null;
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return match?.[1] ?? null;
}
