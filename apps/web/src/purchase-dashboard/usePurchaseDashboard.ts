import { useQueries, useQuery } from '@tanstack/react-query';
import {
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
  fetchPurchaseOrderCount,
  fetchPurchaseOrders,
  fetchPurchaseRequestCount,
  fetchPurchaseRequests,
  fetchVendorInvoices,
} from './api';
import {
  buildPipelineCards,
  dueDeliveryAgeingRows,
  paymentDueAgeingRows,
  pendingPrAgeingRows,
  toVendorExceptionRows,
} from './derivePipeline';
import {
  buildOpsPipelineCards,
  fetchProcurementDashboard,
} from './procurementDashboardApi';
import { purchaseDashboardKeys } from './queryKeys';
import type { PipelineCountInput } from './derivePipeline';

export type PurchaseDashArgs = {
  projectId: string | null;
  date: string;
  canDashboard: boolean;
  canPurchase: boolean;
  canVendorInvoice: boolean;
};

const PENDING_PR_STATUSES = [
  PurchaseRequestStatus.Submitted,
  PurchaseRequestStatus.Reviewed,
  PurchaseRequestStatus.Approved,
  PurchaseRequestStatus.Sourcing,
] as const;

const OPEN_PO_STATUSES = [
  PurchaseOrderStatus.Issued,
  PurchaseOrderStatus.PartiallyReceived,
] as const;

const PAYABLE_INVOICE_STATUSES = [
  VendorInvoiceStatus.Approval,
  VendorInvoiceStatus.Posted,
] as const;

export function usePurchaseDashboard(args: PurchaseDashArgs) {
  const enabled =
    Boolean(args.projectId) &&
    Boolean(args.date) &&
    args.canDashboard;
  const projectId = args.projectId ?? '';
  const date = args.date;

  const opsQuery = useQuery({
    queryKey: purchaseDashboardKeys.ops(projectId),
    enabled: enabled && args.canPurchase,
    queryFn: () => fetchProcurementDashboard(projectId),
    staleTime: 30_000,
    retry: false,
  });

  const prCountQueries = useQueries({
    queries: PENDING_PR_STATUSES.map((status) => ({
      queryKey: [
        ...purchaseDashboardKeys.pipeline(projectId, date),
        'pr',
        status,
      ] as const,
      enabled: enabled && args.canPurchase,
      queryFn: () => fetchPurchaseRequestCount(projectId, status),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const poPendingQuery = useQuery({
    queryKey: [
      ...purchaseDashboardKeys.pipeline(projectId, date),
      'po',
      PurchaseOrderStatus.PendingApproval,
    ] as const,
    enabled: enabled && args.canPurchase,
    queryFn: () =>
      fetchPurchaseOrderCount(
        projectId,
        PurchaseOrderStatus.PendingApproval,
      ),
    staleTime: 30_000,
    retry: false,
  });

  const poIssuedQuery = useQuery({
    queryKey: [
      ...purchaseDashboardKeys.pipeline(projectId, date),
      'po',
      PurchaseOrderStatus.Issued,
    ] as const,
    enabled: enabled && args.canPurchase,
    queryFn: () =>
      fetchPurchaseOrderCount(projectId, PurchaseOrderStatus.Issued),
    staleTime: 30_000,
    retry: false,
  });

  const poPartialQuery = useQuery({
    queryKey: [
      ...purchaseDashboardKeys.pipeline(projectId, date),
      'po',
      PurchaseOrderStatus.PartiallyReceived,
    ] as const,
    enabled: enabled && args.canPurchase,
    queryFn: () =>
      fetchPurchaseOrderCount(
        projectId,
        PurchaseOrderStatus.PartiallyReceived,
      ),
    staleTime: 30_000,
    retry: false,
  });

  const openPosQuery = useQuery({
    queryKey: purchaseDashboardKeys.openPos(projectId),
    enabled: enabled && args.canPurchase,
    queryFn: async () => {
      const pages = await Promise.all(
        OPEN_PO_STATUSES.map((status) =>
          fetchPurchaseOrders({
            projectId,
            status,
            page: 1,
            limit: 100,
          }),
        ),
      );
      return pages.flatMap((p) => p.items);
    },
    staleTime: 30_000,
    retry: false,
  });

  const pendingPrListQuery = useQuery({
    queryKey: purchaseDashboardKeys.pendingPrs(projectId),
    enabled: enabled && args.canPurchase,
    queryFn: async () => {
      const pages = await Promise.all(
        PENDING_PR_STATUSES.map((status) =>
          fetchPurchaseRequests({
            projectId,
            status,
            page: 1,
            limit: 50,
          }),
        ),
      );
      return pages.flatMap((p) => p.items);
    },
    staleTime: 30_000,
    retry: false,
  });

  const exceptionsQuery = useQuery({
    queryKey: purchaseDashboardKeys.exceptions(projectId),
    enabled: enabled && args.canVendorInvoice,
    queryFn: () =>
      fetchVendorInvoices({
        projectId,
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        page: 1,
        limit: 100,
      }),
    staleTime: 30_000,
    retry: false,
  });

  const paymentDueQuery = useQuery({
    queryKey: purchaseDashboardKeys.paymentDue(projectId),
    enabled: enabled && args.canVendorInvoice,
    queryFn: async () => {
      const pages = await Promise.all(
        PAYABLE_INVOICE_STATUSES.map((status) =>
          fetchVendorInvoices({
            projectId,
            status,
            page: 1,
            limit: 100,
          }),
        ),
      );
      return pages.flatMap((p) => p.items);
    },
    staleTime: 30_000,
    retry: false,
  });

  const dueDeliveryRows = dueDeliveryAgeingRows(
    openPosQuery.data ?? [],
    date,
  );
  const paymentDueRows = paymentDueAgeingRows(
    paymentDueQuery.data ?? [],
    date,
  );
  const pendingPrRows = pendingPrAgeingRows(
    pendingPrListQuery.data ?? [],
    date,
  );
  const exceptionRows = toVendorExceptionRows(
    exceptionsQuery.data?.items ?? [],
  );

  const counts: PipelineCountInput = {
    prSubmitted: prCountQueries[0]?.data ?? 0,
    prReviewed: prCountQueries[1]?.data ?? 0,
    prApproved: prCountQueries[2]?.data ?? 0,
    prSourcing: prCountQueries[3]?.data ?? 0,
    poPendingApproval: poPendingQuery.data ?? 0,
    poIssued: poIssuedQuery.data ?? 0,
    poPartiallyReceived: poPartialQuery.data ?? 0,
    dueDelivery: dueDeliveryRows.length,
    invoiceExceptions:
      exceptionsQuery.data?.meta?.total ?? exceptionRows.length,
    paymentsDue: paymentDueRows.length,
  };

  const purchaseLoading =
    args.canPurchase &&
    (prCountQueries.some((q) => q.isLoading || q.isFetching) ||
      poPendingQuery.isLoading ||
      poPendingQuery.isFetching ||
      poIssuedQuery.isLoading ||
      poIssuedQuery.isFetching ||
      poPartialQuery.isLoading ||
      poPartialQuery.isFetching ||
      openPosQuery.isLoading ||
      openPosQuery.isFetching ||
      pendingPrListQuery.isLoading ||
      pendingPrListQuery.isFetching);

  const invoiceLoading =
    args.canVendorInvoice &&
    (exceptionsQuery.isLoading ||
      exceptionsQuery.isFetching ||
      paymentDueQuery.isLoading ||
      paymentDueQuery.isFetching);

  const purchaseError =
    prCountQueries.find((q) => q.isError)?.error ??
    poPendingQuery.error ??
    poIssuedQuery.error ??
    poPartialQuery.error ??
    openPosQuery.error ??
    pendingPrListQuery.error;

  const invoiceError = exceptionsQuery.error ?? paymentDueQuery.error;

  const refetchAll = () => {
    void opsQuery.refetch();
    for (const q of prCountQueries) {
      void q.refetch();
    }
    void poPendingQuery.refetch();
    void poIssuedQuery.refetch();
    void poPartialQuery.refetch();
    void openPosQuery.refetch();
    void pendingPrListQuery.refetch();
    void exceptionsQuery.refetch();
    void paymentDueQuery.refetch();
  };

  const opsAvailable = Boolean(opsQuery.data) && !opsQuery.isError;
  const composedCards = buildPipelineCards(counts);

  return {
    /** Prefer dedicated ops counts when `GET /procurement/dashboard` succeeds. */
    pipelineCards: opsAvailable
      ? buildOpsPipelineCards(opsQuery.data!)
      : composedCards,
    composedPipelineCards: composedCards,
    opsAvailable,
    opsCounts: opsQuery.data ?? null,
    counts,
    pendingPrRows,
    dueDeliveryRows,
    paymentDueRows,
    exceptionRows,
    purchaseLoading,
    opsLoading: args.canPurchase && (opsQuery.isLoading || opsQuery.isFetching),
    invoiceLoading,
    purchaseError,
    invoiceError,
    refetchAll,
  };
}
