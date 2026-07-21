import { apiGet } from '@/api/client';

/** Nest `GET /procurement/dashboard` response. */
export type ProcurementDashboardCounts = {
  pendingPr: number;
  pendingRfq: number;
  pendingQuotations: number;
  pendingApprovals: number;
  openPo: number;
  delayedPo: number;
  grnDraft: number;
  budgetUtilization: number | null;
};

/** `GET /procurement/dashboard?projectId=` — `dashboard.view` + `purchase.view` */
export async function fetchProcurementDashboard(
  projectId: string,
): Promise<ProcurementDashboardCounts> {
  const res = await apiGet<ProcurementDashboardCounts>(
    '/procurement/dashboard',
    { projectId },
  );
  if (!res.data) {
    throw new Error(res.message || 'Procurement dashboard unavailable');
  }
  return {
    pendingPr: Number(res.data.pendingPr ?? 0),
    pendingRfq: Number(res.data.pendingRfq ?? 0),
    pendingQuotations: Number(res.data.pendingQuotations ?? 0),
    pendingApprovals: Number(res.data.pendingApprovals ?? 0),
    openPo: Number(res.data.openPo ?? 0),
    delayedPo: Number(res.data.delayedPo ?? 0),
    grnDraft: Number(res.data.grnDraft ?? 0),
    budgetUtilization:
      res.data.budgetUtilization == null
        ? null
        : Number(res.data.budgetUtilization),
  };
}

export function buildOpsPipelineCards(
  counts: ProcurementDashboardCounts,
): Array<{
  id: string;
  title: string;
  count: number;
  amount: null;
  drillPath: string;
  drillLabel: string;
}> {
  return [
    {
      id: 'ops-pending-pr',
      title: 'Pending PR',
      count: counts.pendingPr,
      amount: null,
      drillPath: '/procurement/purchase-requests',
      drillLabel: 'Purchase requests',
    },
    {
      id: 'ops-pending-rfq',
      title: 'Pending RFQ',
      count: counts.pendingRfq,
      amount: null,
      drillPath: '/procurement/rfqs',
      drillLabel: 'RFQs',
    },
    {
      id: 'ops-pending-quotations',
      title: 'Pending quotations',
      count: counts.pendingQuotations,
      amount: null,
      drillPath: '/procurement/quotations',
      drillLabel: 'Quotations',
    },
    {
      id: 'ops-pending-approvals',
      title: 'Pending approvals',
      count: counts.pendingApprovals,
      amount: null,
      drillPath: '/procurement/purchase-requests',
      drillLabel: 'Purchase requests',
    },
    {
      id: 'ops-open-po',
      title: 'Open PO',
      count: counts.openPo,
      amount: null,
      drillPath: '/procurement/purchase-orders',
      drillLabel: 'Purchase orders',
    },
    {
      id: 'ops-delayed-po',
      title: 'Delayed PO',
      count: counts.delayedPo,
      amount: null,
      drillPath: '/procurement/purchase-orders',
      drillLabel: 'Purchase orders',
    },
    {
      id: 'ops-grn-draft',
      title: 'GRN draft',
      count: counts.grnDraft,
      amount: null,
      drillPath: '/procurement/grns',
      drillLabel: 'Goods receipts',
    },
  ];
}
