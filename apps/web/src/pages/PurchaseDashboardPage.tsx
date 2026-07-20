import { useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  AgeingList,
  PipelineCards,
  PurchaseFilters,
  VendorExceptionTable,
  todayIsoDate,
  usePurchaseDashboard,
  type PurchaseFilterState,
} from '@/purchase-dashboard';

/**
 * Purchase dashboard (Micro Phase 025).
 *
 * Composes existing list APIs (no dedicated purchase-dashboard module):
 * - `GET /purchase-requests` / `GET /purchase-orders` (`purchase.view`)
 * - `GET /vendor-invoices` (`vendor_invoice.view`)
 *
 * Route permission: `dashboard.view` (catalog has no `dashboard.purchase.view`).
 * Date + project filters are required before loading.
 */
export function PurchaseDashboardPage() {
  const { hasPermission, access } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();

  const [filters, setFilters] = useState<PurchaseFilterState>(() => ({
    date: todayIsoDate(),
    projectId: selectedProjectId ?? '',
  }));

  useEffect(() => {
    if (!filters.projectId && selectedProjectId) {
      setFilters((prev) => ({ ...prev, projectId: selectedProjectId }));
    }
  }, [selectedProjectId, filters.projectId]);

  const canDashboard = Boolean(access) && hasPermission('dashboard.view');
  const canPurchase = hasPermission('purchase.view');
  const canVendorInvoice = hasPermission('vendor_invoice.view');

  const filtersReady = Boolean(filters.date) && Boolean(filters.projectId);

  const dash = usePurchaseDashboard({
    projectId: filtersReady ? filters.projectId : null,
    date: filters.date,
    canDashboard,
    canPurchase,
    canVendorInvoice,
  });

  if (access && !canDashboard) {
    return (
      <PermissionDenied
        title="Purchase dashboard unavailable"
        message="You need the dashboard.view permission to open the purchase workspace."
      />
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No project access"
        description="Select or obtain access to a project before viewing the purchase pipeline."
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Typography color="text.secondary">
        Procurement overview — PR/PO pipeline, due deliveries, invoice match
        exceptions and payments due. Date and project filters are required.
      </Typography>

      <PurchaseFilters
        value={filters}
        projects={projects}
        onChange={(next) => {
          setFilters(next);
          if (next.projectId && next.projectId !== selectedProjectId) {
            setSelectedProjectId(next.projectId);
          }
        }}
      />

      {!filtersReady ? (
        <EmptyState
          title="Filters required"
          description="Choose an as-of date and a project to load the purchase pipeline."
        />
      ) : null}

      {filtersReady && !canPurchase && !canVendorInvoice ? (
        <PermissionDenied
          title="Procurement data unavailable"
          message="You need purchase.view and/or vendor_invoice.view to load pipeline sections."
          showHomeLink={false}
        />
      ) : null}

      {filtersReady && dash.purchaseError ? (
        <RetryPanel
          error={dash.purchaseError}
          onRetry={() => dash.refetchAll()}
          forceRetry
        />
      ) : null}

      {filtersReady &&
      (canPurchase || canVendorInvoice) &&
      !(canPurchase && dash.purchaseError) ? (
        <>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: 1 }}
          >
            Pipeline
          </Typography>
          <PipelineCards
            cards={dash.pipelineCards.filter((card) => {
              if (
                card.id === 'invoice-exceptions' ||
                card.id === 'payments-due'
              ) {
                return canVendorInvoice;
              }
              return canPurchase;
            })}
            loading={dash.purchaseLoading || dash.invoiceLoading}
          />
        </>
      ) : null}

      {filtersReady && canPurchase && !dash.purchaseError ? (
        <>
          <AgeingList
            title="Pending PR ageing (required-by)"
            rows={dash.pendingPrRows}
            loading={dash.purchaseLoading}
            emptyDescription="No submitted/reviewed/approved/sourcing purchase requests for this project."
          />

          <AgeingList
            title="Due delivery (PO expected date ≤ as-of)"
            rows={dash.dueDeliveryRows}
            loading={dash.purchaseLoading}
            emptyDescription="No issued or partially received POs are due on or before the as-of date."
          />
        </>
      ) : null}

      {filtersReady && canPurchase && !canVendorInvoice ? (
        <PermissionDenied
          title="Invoice sections unavailable"
          message="You need vendor_invoice.view to load invoice exceptions and payments due."
          showHomeLink={false}
        />
      ) : null}

      {filtersReady && dash.invoiceError ? (
        <RetryPanel
          error={dash.invoiceError}
          onRetry={() => dash.refetchAll()}
          forceRetry
        />
      ) : null}

      {filtersReady && canVendorInvoice && !dash.invoiceError ? (
        <>
          <AgeingList
            title="Payments due (approval / posted, remaining payable)"
            rows={dash.paymentDueRows}
            loading={dash.invoiceLoading}
            emptyDescription="No payable vendor invoices are due on or before the as-of date."
          />
          <VendorExceptionTable
            rows={dash.exceptionRows}
            loading={dash.invoiceLoading}
          />
        </>
      ) : null}
    </Stack>
  );
}
