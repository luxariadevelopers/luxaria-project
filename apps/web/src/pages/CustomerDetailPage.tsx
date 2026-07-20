import { useMemo, useState, type ReactNode } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  EntityDetailTabs,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { resolveAadhaarDisplay } from '@/customers/aadhaarMasking';
import { CustomerBookingsPanel } from '@/customers/CustomerBookingsPanel';
import { CustomerDocumentPanel } from '@/customers/CustomerDocumentPanel';
import { CustomerKycChecklist } from '@/customers/CustomerKycChecklist';
import { CustomerLedgerPanel } from '@/customers/CustomerLedgerPanel';
import { CustomerReceiptsPanel } from '@/customers/CustomerReceiptsPanel';
import { JointApplicantCard } from '@/customers/JointApplicantCard';
import { KycStatusChip } from '@/customers/KycStatusChip';
import {
  customerStatusLabel,
  customerUiState,
  fundingTypeLabel,
} from '@/customers/kycState';
import {
  CUSTOMER_DETAIL_TAB_DEFS,
  resolveCustomerCapabilities,
  type CustomerDetailTabId,
} from '@/customers/roleAccess';
import { CustomerStatus } from '@/customers/types';
import {
  useActivateCustomer,
  useCustomerBookings,
  useCustomerDetail,
  useCustomerDocuments,
  useCustomerLedger,
  useCustomerReceipts,
  useDeactivateCustomer,
  useUploadCustomerDocument,
} from '@/customers/useCustomers';

/**
 * Customer 360 + KYC (Micro Phase 100).
 * APIs: GET /customers/:id, documents, bookings, receipts, customer-ledger;
 * verify-kyc / activate / deactivate.
 */
export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveCustomerCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');
  const [aadhaarRevealed, setAadhaarRevealed] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useCustomerDetail(customerId, canView);
  const docsQuery = useCustomerDocuments(
    customerId,
    canView && (tab === 'documents' || tab === 'kyc'),
  );
  const bookingsQuery = useCustomerBookings(
    customerId,
    canView && caps.canViewBookings && tab === 'bookings',
  );
  const receiptsQuery = useCustomerReceipts(
    customerId,
    canView && caps.canViewReceipts && tab === 'receipts',
  );
  const ledgerQuery = useCustomerLedger(
    customerId,
    canView && caps.canViewLedger && tab === 'ledger',
  );
  const activate = useActivateCustomer(customerId);
  const deactivate = useDeactivateCustomer(customerId);
  const upload = useUploadCustomerDocument(customerId ?? '');

  const customer = detailQuery.data;
  const ui = customer ? customerUiState(customer) : null;

  const aadhaarDisplay = useMemo(() => {
    if (!customer) {
      return { display: '—', canReveal: false, isRevealed: false };
    }
    return resolveAadhaarDisplay({
      aadhaar: customer.aadhaar,
      aadhaarReference: customer.aadhaarReference,
      canViewSensitive: caps.canViewSensitive,
      revealed: aadhaarRevealed,
    });
  }, [customer, caps.canViewSensitive, aadhaarRevealed]);

  const summaryFields = useMemo(() => {
    if (!customer) return [];
    return [
      {
        id: 'funding',
        label: 'Funding',
        value: fundingTypeLabel(customer.fundingType),
      },
      { id: 'pan', label: 'PAN', value: customer.pan ?? '—' },
      {
        id: 'email',
        label: 'Email',
        value: customer.contact?.email ?? '—',
      },
      {
        id: 'phone',
        label: 'Phone',
        value: customer.contact?.phone ?? '—',
      },
    ];
  }, [customer]);

  const actions: EntityDetailAction[] = useMemo(() => {
    if (!customer || !customerId) return [];
    return [
      {
        id: 'activate',
        label: 'Activate',
        permission: 'customer.manage',
        allowedStatuses: [
          CustomerStatus.Draft,
          CustomerStatus.PendingKyc,
          CustomerStatus.Inactive,
        ],
        disabled: !ui?.canActivate || activate.isPending,
        loading: activate.isPending,
        variant: 'contained',
        color: 'success',
        onClick: () => {
          void activate
            .mutateAsync(customerId)
            .then(() => success('Customer activated'))
            .catch((err: unknown) => notifyError(getErrorMessage(err)));
        },
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        permission: 'customer.manage',
        allowedStatuses: [CustomerStatus.Active],
        disabled: !ui?.canDeactivate || deactivate.isPending,
        loading: deactivate.isPending,
        color: 'error',
        onClick: () => {
          void deactivate
            .mutateAsync(customerId)
            .then(() => success('Customer deactivated'))
            .catch((err: unknown) => notifyError(getErrorMessage(err)));
        },
      },
    ];
  }, [
    customer,
    customerId,
    ui?.canActivate,
    ui?.canDeactivate,
    activate,
    deactivate,
    success,
    notifyError,
  ]);

  if (
    detailQuery.error &&
    isForbiddenError(detailQuery.error) &&
    canView
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Customer denied"
        message="You do not have access to this customer record."
      />
    );
  }

  const docCategories = (docsQuery.data ?? []).map((d) => d.category);

  return (
    <EntityDetailLayout
      canView={canView}
      projectReady
      loading={detailQuery.isLoading}
      error={detailQuery.error}
      onRetry={() => void detailQuery.refetch()}
      notFound={!detailQuery.isLoading && !detailQuery.error && !customer}
      permissionTitle="Customer unavailable"
      permissionMessage="You need the customer.view permission to open this customer."
      notFoundTitle="Customer not found"
      notFoundDescription="This customer may have been removed or the id is invalid."
      header={
        customer ? (
          <DetailHeader
            title={customer.fullName}
            code={customer.customerCode}
            subtitle={customer.contact?.email ?? undefined}
            backTo="/sales/customers"
            backLabel="Customers"
            meta={
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                <Chip
                  size="small"
                  label={customerStatusLabel(customer.status)}
                  color={
                    customer.status === CustomerStatus.Active
                      ? 'success'
                      : 'default'
                  }
                />
                <KycStatusChip status={customer.kycStatus} />
              </Stack>
            }
          />
        ) : undefined
      }
      summary={
        customer ? <SummaryCards fields={summaryFields} /> : undefined
      }
      actionBar={
        customer ? (
          <EntityActionBar
            actions={actions}
            status={customer.status}
            hasPermission={hasPermission}
            emptyHint="No activate/deactivate actions for this status and your permissions. KYC actions are on the KYC tab."
          />
        ) : undefined
      }
      tabs={
        customer ? (
          <EntityDetailTabs
            hasPermission={hasPermission}
            value={tab}
            onChange={setTab}
            tabs={CUSTOMER_DETAIL_TAB_DEFS.map((def) => {
              const id = def.id as CustomerDetailTabId;
              let content: ReactNode = null;
              switch (id) {
                case 'overview':
                  content = (
                    <Stack spacing={1.5}>
                      <Typography variant="body2" color="text.secondary">
                        Identity and contact. Full Aadhaar is hidden unless you
                        have customer.manage and choose to reveal.
                      </Typography>
                      <Typography variant="subtitle2">Identity</Typography>
                      <Typography variant="body2">
                        PAN: {customer.pan ?? '—'}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <Typography variant="body2">
                          Aadhaar: {aadhaarDisplay.display}
                        </Typography>
                        {aadhaarDisplay.canReveal ? (
                          <Button
                            size="small"
                            onClick={() => setAadhaarRevealed((v) => !v)}
                          >
                            {aadhaarDisplay.isRevealed ? 'Hide' : 'Reveal'}
                          </Button>
                        ) : null}
                      </Stack>
                      <Typography variant="body2">
                        Funding: {fundingTypeLabel(customer.fundingType)}
                        {customer.loanBank ? ` · ${customer.loanBank}` : ''}
                      </Typography>
                      <Typography variant="body2">
                        Occupation: {customer.occupation ?? '—'}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ pt: 1 }}>
                        Contact
                      </Typography>
                      <Typography variant="body2">
                        Email: {customer.contact?.email ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        Phone: {customer.contact?.phone ?? '—'}
                      </Typography>
                      <Typography variant="body2">
                        Address:{' '}
                        {[
                          customer.address?.addressLine1,
                          customer.address?.city,
                          customer.address?.state,
                          customer.address?.pincode,
                        ]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </Typography>
                    </Stack>
                  );
                  break;
                case 'joint':
                  content = (
                    <JointApplicantCard
                      customer={customer}
                      canView={caps.canView}
                      canViewSensitive={caps.canViewSensitive}
                    />
                  );
                  break;
                case 'documents':
                  content = (
                    <CustomerDocumentPanel
                      documents={docsQuery.data ?? []}
                      loading={docsQuery.isLoading || docsQuery.isFetching}
                      error={docsQuery.error}
                      onRetry={() => void docsQuery.refetch()}
                      canView={caps.canView}
                      canUpload={caps.canUploadDocument}
                      canViewSensitive={caps.canViewSensitive}
                      uploading={upload.isPending}
                      onUpload={async (file, category) => {
                        try {
                          await upload.mutateAsync({ file, category });
                          success('Document uploaded');
                        } catch (err) {
                          notifyError(getErrorMessage(err));
                        }
                      }}
                    />
                  );
                  break;
                case 'kyc':
                  content = (
                    <CustomerKycChecklist
                      customer={customer}
                      canView={caps.canView}
                      canVerifyKyc={caps.canVerifyKyc}
                      documentCategories={docCategories}
                    />
                  );
                  break;
                case 'bookings':
                  content = (
                    <CustomerBookingsPanel
                      bookings={bookingsQuery.data ?? []}
                      loading={
                        bookingsQuery.isLoading || bookingsQuery.isFetching
                      }
                      error={bookingsQuery.error}
                      onRetry={() => void bookingsQuery.refetch()}
                      canView={caps.canViewBookings}
                    />
                  );
                  break;
                case 'receipts':
                  content = (
                    <CustomerReceiptsPanel
                      receipts={receiptsQuery.data ?? []}
                      loading={
                        receiptsQuery.isLoading || receiptsQuery.isFetching
                      }
                      error={receiptsQuery.error}
                      onRetry={() => void receiptsQuery.refetch()}
                      canView={caps.canViewReceipts}
                    />
                  );
                  break;
                case 'ledger':
                  content = (
                    <CustomerLedgerPanel
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
