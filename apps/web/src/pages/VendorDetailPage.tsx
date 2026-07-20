import { useMemo, useState, type ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityDetailLayout,
  EntityDetailTabs,
  SummaryCards,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { VendorBankCard } from '@/vendors/VendorBankCard';
import { VendorDocumentsPanel } from '@/vendors/VendorDocumentsPanel';
import { VendorInvoicesPanel } from '@/vendors/VendorInvoicesPanel';
import { VendorLedgerPanel } from '@/vendors/VendorLedgerPanel';
import { VendorPayableSummary } from '@/vendors/VendorPayableSummary';
import { VendorPaymentsPanel } from '@/vendors/VendorPaymentsPanel';
import { VendorPerformancePanel } from '@/vendors/VendorPerformancePanel';
import { VendorProjectsPanel } from '@/vendors/VendorProjectsPanel';
import {
  vendorStatusLabel,
  vendorVerificationLabel,
} from '@/vendors/labels';
import {
  VENDOR_DETAIL_TAB_DEFS,
  resolveVendorCapabilities,
  type VendorDetailTabId,
} from '@/vendors/roleAccess';
import { VendorStatus } from '@/vendors/types';
import {
  useVendorDetail,
  useVendorDocuments,
  useVendorInvoices,
  useVendorLedger,
  useVendorPayments,
  useVendorProjects,
  useVendorQualityScore,
} from '@/vendors/useVendors';

/**
 * Vendor 360 — `/procurement/vendors/:vendorId` (Micro Phase 057).
 *
 * APIs: GET /vendors/:id, documents, projects, ledger;
 * GET /vendor-invoices?vendorId=; GET /vendor-payments?vendorId=;
 * GET /vendors/:vendorId/quality-score (optional).
 */
export function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveVendorCapabilities(hasPermission);
  const [tab, setTab] = useState<string>('overview');

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useVendorDetail(vendorId, canView);

  const docsQuery = useVendorDocuments(
    vendorId,
    canView && tab === 'documents',
  );
  const projectsQuery = useVendorProjects(
    vendorId,
    canView && tab === 'projects',
  );
  const qualityQuery = useVendorQualityScore(
    vendorId,
    canView && caps.canViewQuality && tab === 'performance',
  );

  const invoicesQuery = useVendorInvoices(
    vendorId,
    canView &&
      caps.canViewInvoices &&
      (tab === 'invoices' || tab === 'payable'),
  );
  const paymentsQuery = useVendorPayments(
    vendorId,
    canView &&
      caps.canViewPayments &&
      (tab === 'payments' || tab === 'payable'),
  );
  const ledgerQuery = useVendorLedger(
    vendorId,
    canView &&
      caps.canViewLedger &&
      (tab === 'ledger' || tab === 'payable'),
  );

  const vendor = detailQuery.data;

  const summaryFields = useMemo(() => {
    if (!vendor) return [];
    return [
      {
        id: 'trade',
        label: 'Trade name',
        value: vendor.tradeName ?? '—',
      },
      { id: 'gstin', label: 'GSTIN', value: vendor.gstin ?? '—' },
      { id: 'pan', label: 'PAN', value: vendor.pan ?? '—' },
      {
        id: 'contact',
        label: 'Contact',
        value: vendor.contact?.contactPerson ?? vendor.contact?.phone ?? '—',
      },
    ];
  }, [vendor]);

  if (detailQuery.error && isForbiddenError(detailQuery.error) && canView) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Vendor denied"
        message="You do not have access to this vendor record."
      />
    );
  }

  const financeLoading =
    (invoicesQuery.isLoading && caps.canViewInvoices) ||
    (paymentsQuery.isLoading && caps.canViewPayments) ||
    (ledgerQuery.isLoading && caps.canViewLedger);
  const financeError =
    invoicesQuery.error ?? paymentsQuery.error ?? ledgerQuery.error;

  return (
    <EntityDetailLayout
      canView={canView}
      projectReady
      loading={detailQuery.isLoading}
      error={detailQuery.error}
      onRetry={() => void detailQuery.refetch()}
      notFound={!detailQuery.isLoading && !detailQuery.error && !vendor}
      permissionTitle="Vendor unavailable"
      permissionMessage="You need the vendor.view permission to open this vendor."
      notFoundTitle="Vendor not found"
      notFoundDescription="This vendor may have been removed or the id is invalid."
      header={
        vendor ? (
          <DetailHeader
            title={vendor.legalName}
            code={vendor.vendorCode}
            subtitle={vendor.tradeName ?? vendor.contact?.email ?? undefined}
            backTo="/procurement/vendors"
            backLabel="Vendors"
            meta={
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                <Chip
                  size="small"
                  label={vendorStatusLabel(vendor.status)}
                  color={
                    vendor.status === VendorStatus.Active
                      ? 'success'
                      : vendor.status === VendorStatus.Blocked
                        ? 'error'
                        : 'default'
                  }
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={vendorVerificationLabel(vendor.verificationStatus)}
                />
              </Stack>
            }
          />
        ) : undefined
      }
      summary={
        vendor ? <SummaryCards fields={summaryFields} /> : undefined
      }
      tabs={
        vendor ? (
          <EntityDetailTabs
            hasPermission={hasPermission}
            value={tab}
            onChange={setTab}
            tabs={VENDOR_DETAIL_TAB_DEFS.map((def) => {
              const id = def.id as VendorDetailTabId;
              let content: ReactNode = null;
              switch (id) {
                case 'overview':
                  content = (
                    <Stack spacing={1.5}>
                      <Typography variant="body2" color="text.secondary">
                        Identity, contact, and commercial profile. Bank details
                        stay masked; finance tabs require payment / invoice
                        permissions.
                      </Typography>
                      <Typography variant="subtitle2">Identity</Typography>
                      <Typography variant="body2">
                        Legal name: {vendor.legalName}
                      </Typography>
                      <Typography variant="body2">
                        Trade name: {vendor.tradeName ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        GSTIN: {vendor.gstin ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        PAN: {vendor.pan ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        Categories:{' '}
                        {vendor.materialCategories.length > 0
                          ? vendor.materialCategories.join(', ')
                          : '—'}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ pt: 1 }}>
                        Contact
                      </Typography>
                      <Typography variant="body2">
                        Person: {vendor.contact?.contactPerson ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        Email: {vendor.contact?.email ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        Phone: {vendor.contact?.phone ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        Address:{' '}
                        {[
                          vendor.contact?.addressLine1,
                          vendor.contact?.city,
                          vendor.contact?.state,
                          vendor.contact?.pincode,
                        ]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </Typography>
                      {vendor.blockReason ? (
                        <Typography variant="body2" color="error">
                          Block reason: {vendor.blockReason}
                        </Typography>
                      ) : null}
                    </Stack>
                  );
                  break;
                case 'bank':
                  content = (
                    <VendorBankCard vendor={vendor} canView={caps.canView} />
                  );
                  break;
                case 'documents':
                  content = (
                    <VendorDocumentsPanel
                      documents={docsQuery.data ?? []}
                      loading={docsQuery.isLoading || docsQuery.isFetching}
                      error={docsQuery.error}
                      onRetry={() => void docsQuery.refetch()}
                      canView={caps.canView}
                    />
                  );
                  break;
                case 'projects':
                  content = (
                    <VendorProjectsPanel
                      assignments={projectsQuery.data ?? []}
                      loading={
                        projectsQuery.isLoading || projectsQuery.isFetching
                      }
                      error={projectsQuery.error}
                      onRetry={() => void projectsQuery.refetch()}
                      canView={caps.canView}
                    />
                  );
                  break;
                case 'performance':
                  content = (
                    <VendorPerformancePanel
                      vendor={vendor}
                      canView={caps.canView}
                      canViewQuality={caps.canViewQuality}
                      qualityScore={qualityQuery.data}
                      qualityLoading={
                        qualityQuery.isLoading || qualityQuery.isFetching
                      }
                      qualityError={qualityQuery.error}
                      onRetryQuality={() => void qualityQuery.refetch()}
                    />
                  );
                  break;
                case 'payable':
                  content = (
                    <VendorPayableSummary
                      canView={caps.canViewPayments}
                      invoices={
                        caps.canViewInvoices ? (invoicesQuery.data ?? []) : []
                      }
                      payments={paymentsQuery.data ?? []}
                      ledger={ledgerQuery.data}
                      loading={financeLoading}
                      error={financeError}
                      onRetry={() => {
                        void invoicesQuery.refetch();
                        void paymentsQuery.refetch();
                        void ledgerQuery.refetch();
                      }}
                    />
                  );
                  break;
                case 'invoices':
                  content = (
                    <VendorInvoicesPanel
                      invoices={invoicesQuery.data ?? []}
                      loading={
                        invoicesQuery.isLoading || invoicesQuery.isFetching
                      }
                      error={invoicesQuery.error}
                      onRetry={() => void invoicesQuery.refetch()}
                      canView={caps.canViewInvoices}
                    />
                  );
                  break;
                case 'payments':
                  content = (
                    <VendorPaymentsPanel
                      payments={paymentsQuery.data ?? []}
                      loading={
                        paymentsQuery.isLoading || paymentsQuery.isFetching
                      }
                      error={paymentsQuery.error}
                      onRetry={() => void paymentsQuery.refetch()}
                      canView={caps.canViewPayments}
                    />
                  );
                  break;
                case 'ledger':
                  content = (
                    <VendorLedgerPanel
                      ledger={ledgerQuery.data}
                      loading={
                        ledgerQuery.isLoading || ledgerQuery.isFetching
                      }
                      error={ledgerQuery.error}
                      onRetry={() => void ledgerQuery.refetch()}
                      canView={caps.canViewLedger}
                    />
                  );
                  break;
                default:
                  content = null;
              }
              return {
                id: def.id,
                label: def.label,
                permission: def.permission,
                content,
              };
            })}
          />
        ) : undefined
      }
    />
  );
}
