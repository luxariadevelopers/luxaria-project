import type {
  AggregatedInvestorDocument,
  AggregatedInvestorStatement,
  InvestorPortalProjectDetail,
  InvestorPortalProjectSummary,
  InvestorStatementFilters,
} from './types';

function projectMeta(
  summary: InvestorPortalProjectSummary,
): Pick<
  AggregatedInvestorDocument,
  'projectId' | 'projectCode' | 'projectName'
> {
  return {
    projectId: summary.projectId,
    projectCode: summary.projectCode,
    projectName: summary.projectName,
  };
}

export function aggregateInvestorDocuments(
  summaries: readonly InvestorPortalProjectSummary[],
  details: readonly (InvestorPortalProjectDetail | null | undefined)[],
): AggregatedInvestorDocument[] {
  const byProjectId = new Map(
    summaries.map((summary) => [summary.projectId, summary]),
  );
  const rows: AggregatedInvestorDocument[] = [];

  for (const detail of details) {
    if (!detail) continue;
    const summary = byProjectId.get(detail.project.id);
    if (!summary) continue;
    const meta = projectMeta(summary);

    for (const agreement of detail.agreements) {
      rows.push({
        id: `agreement:${detail.project.id}:${agreement.id}`,
        kind: 'agreement',
        ...meta,
        title: agreement.fileName,
        category: agreement.category,
        fileName: agreement.fileName,
        mimeType: agreement.mimeType,
        documentPath: null,
        uploadedAt: agreement.uploadedAt,
      });
    }

    for (const report of detail.reports) {
      if (!report.documentPath) continue;
      rows.push({
        id: `report-doc:${detail.project.id}:${report.id}`,
        kind: 'report',
        ...meta,
        title: report.title,
        category: report.reportType,
        fileName: null,
        mimeType: null,
        documentPath: report.documentPath,
        uploadedAt: report.publishedAt,
      });
    }
  }

  return rows.sort((a, b) =>
    (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''),
  );
}

export function aggregateInvestorStatements(
  summaries: readonly InvestorPortalProjectSummary[],
  details: readonly (InvestorPortalProjectDetail | null | undefined)[],
): AggregatedInvestorStatement[] {
  const byProjectId = new Map(
    summaries.map((summary) => [summary.projectId, summary]),
  );
  const rows: AggregatedInvestorStatement[] = [];

  for (const detail of details) {
    if (!detail) continue;
    const summary = byProjectId.get(detail.project.id);
    if (!summary) continue;
    const meta = projectMeta(summary);

    for (const report of detail.reports) {
      rows.push({
        id: `report:${detail.project.id}:${report.id}`,
        kind: 'report',
        ...meta,
        title: report.title,
        reportType: report.reportType,
        summary: report.summary,
        documentPath: report.documentPath,
        publishedAt: report.publishedAt,
        receivedDate: null,
        amount: null,
        paymentMode: null,
        hasDocument: Boolean(report.documentPath),
      });
    }

    for (const receipt of detail.receipts) {
      rows.push({
        id: `receipt:${detail.project.id}:${receipt.id}`,
        kind: 'receipt',
        ...meta,
        title: receipt.receiptNumber,
        reportType: null,
        summary: null,
        documentPath: null,
        publishedAt: null,
        receivedDate: receipt.receivedDate,
        amount: receipt.amount,
        paymentMode: receipt.paymentMode,
        hasDocument: receipt.hasDocument,
      });
    }
  }

  return rows.sort((a, b) => {
    const aDate = a.publishedAt ?? a.receivedDate ?? '';
    const bDate = b.publishedAt ?? b.receivedDate ?? '';
    return bDate.localeCompare(aDate);
  });
}

function withinDateRange(
  isoDate: string | null,
  fromDate: string | null,
  toDate: string | null,
): boolean {
  if (!isoDate) return fromDate == null && toDate == null;
  const day = isoDate.slice(0, 10);
  if (fromDate && day < fromDate) return false;
  if (toDate && day > toDate) return false;
  return true;
}

export function filterInvestorStatements(
  rows: readonly AggregatedInvestorStatement[],
  filters: InvestorStatementFilters,
): AggregatedInvestorStatement[] {
  return rows.filter((row) => {
    if (filters.projectId !== 'all' && row.projectId !== filters.projectId) {
      return false;
    }
    if (filters.kind !== 'all' && row.kind !== filters.kind) {
      return false;
    }
    if (
      filters.reportType !== 'all' &&
      row.kind === 'report' &&
      row.reportType !== filters.reportType
    ) {
      return false;
    }
    if (
      filters.reportType !== 'all' &&
      row.kind === 'receipt' &&
      filters.kind === 'report'
    ) {
      return false;
    }
    const eventDate = row.publishedAt ?? row.receivedDate;
    if (!withinDateRange(eventDate, filters.fromDate, filters.toDate)) {
      return false;
    }
    return true;
  });
}

export function listAuthorisedProjectOptions(
  summaries: readonly InvestorPortalProjectSummary[],
) {
  return summaries.map((project) => ({
    value: project.projectId,
    label: `${project.projectCode} · ${project.projectName}`,
  }));
}
