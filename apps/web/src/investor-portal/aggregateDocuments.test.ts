import { describe, expect, it } from 'vitest';
import {
  aggregateInvestorDocuments,
  aggregateInvestorStatements,
  filterInvestorStatements,
} from './aggregateDocuments';
import type {
  InvestorPortalProjectDetail,
  InvestorPortalProjectSummary,
} from './types';
import { DEFAULT_STATEMENT_FILTERS } from './types';

const summary: InvestorPortalProjectSummary = {
  projectId: 'proj-1',
  projectCode: 'P-001',
  projectName: 'Alpha Towers',
  projectStage: 'construction',
  status: 'active',
  commitmentAmount: 5_000_000,
  amountContributed: 2_000_000,
  pendingContribution: 3_000_000,
  approvedProfitSharePercentage: 25,
  physicalProgressPercent: 30,
};

const detail: InvestorPortalProjectDetail = {
  project: {
    id: 'proj-1',
    projectCode: 'P-001',
    projectName: 'Alpha Towers',
    projectStage: 'construction',
    status: 'active',
  },
  agreements: [
    {
      id: 'agr-1',
      category: 'agreement',
      fileName: 'alpha-agreement.pdf',
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-01T00:00:00.000Z',
    },
  ],
  receipts: [
    {
      id: 'rcpt-1',
      receiptNumber: 'CR-001',
      receivedDate: '2026-06-15T00:00:00.000Z',
      amount: 2_000_000,
      paymentMode: 'bank_transfer',
      hasDocument: true,
    },
  ],
  reports: [
    {
      id: 'rpt-1',
      title: 'Q1 Update',
      reportType: 'progress',
      summary: 'Structure 30% complete',
      documentPath: '507f1f77bcf86cd799439011',
      publishedAt: '2026-07-10T00:00:00.000Z',
    },
    {
      id: 'rpt-2',
      title: 'Summary only',
      reportType: 'financial_summary',
      summary: 'No attachment',
      documentPath: null,
      publishedAt: '2026-07-11T00:00:00.000Z',
    },
  ],
};

describe('aggregateInvestorDocuments', () => {
  it('returns empty when no authorised projects', () => {
    expect(aggregateInvestorDocuments([], [])).toEqual([]);
  });

  it('aggregates agreements and report attachments across projects', () => {
    const rows = aggregateInvestorDocuments([summary], [detail]);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.kind)).toEqual(['report', 'agreement']);
    expect(rows.find((row) => row.kind === 'agreement')?.fileName).toBe(
      'alpha-agreement.pdf',
    );
    expect(rows.find((row) => row.kind === 'report')?.documentPath).toBe(
      '507f1f77bcf86cd799439011',
    );
  });
});

describe('aggregateInvestorStatements', () => {
  it('includes reports and receipts', () => {
    const rows = aggregateInvestorStatements([summary], [detail]);
    expect(rows).toHaveLength(3);
    expect(rows.filter((row) => row.kind === 'report')).toHaveLength(2);
    expect(rows.filter((row) => row.kind === 'receipt')).toHaveLength(1);
  });
});

describe('filterInvestorStatements', () => {
  const rows = aggregateInvestorStatements([summary], [detail]);

  it('filters by project, kind, report type, and date range', () => {
    const filtered = filterInvestorStatements(rows, {
      ...DEFAULT_STATEMENT_FILTERS,
      kind: 'report',
      reportType: 'progress',
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe('Q1 Update');
  });
});
