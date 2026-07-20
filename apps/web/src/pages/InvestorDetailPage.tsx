import { useMemo, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
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
import { InvestorBankCard } from '@/investors/InvestorBankCard';
import { InvestorDocumentPanel } from '@/investors/InvestorDocumentPanel';
import { InvestorKycChecklist } from '@/investors/InvestorKycChecklist';
import { InvestorNomineeCard } from '@/investors/InvestorNomineeCard';
import { KycStatusChip } from '@/investors/KycStatusChip';
import {
  investorStatusLabel,
  investorTypeLabel,
  investorUiState,
} from '@/investors/kycState';
import { resolveInvestorCapabilities } from '@/investors/roleAccess';
import { InvestorStatus } from '@/investors/types';
import {
  useActivateInvestor,
  useDeactivateInvestor,
  useInvestorDetail,
  useInvestorDocuments,
  useUploadInvestorDocument,
} from '@/investors/useInvestors';

/**
 * Investor detail + KYC (Micro Phase 034).
 * APIs: GET /investors/:id, documents, verify-kyc, activate/deactivate.
 */
export function InvestorDetailPage() {
  const { investorId } = useParams<{ investorId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveInvestorCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useInvestorDetail(investorId, canView);
  const docsQuery = useInvestorDocuments(
    investorId,
    canView && (tab === 'documents' || tab === 'kyc'),
  );
  const activate = useActivateInvestor(investorId);
  const deactivate = useDeactivateInvestor(investorId);
  const upload = useUploadInvestorDocument(investorId ?? '');

  const investor = detailQuery.data;
  const ui = investor ? investorUiState(investor) : null;

  const summaryFields = useMemo(() => {
    if (!investor) return [];
    return [
      {
        id: 'type',
        label: 'Type',
        value: investorTypeLabel(investor.investorType),
      },
      { id: 'pan', label: 'PAN', value: investor.pan ?? '—' },
      {
        id: 'email',
        label: 'Email',
        value: investor.contact?.email ?? '—',
      },
      {
        id: 'phone',
        label: 'Phone',
        value: investor.contact?.phone ?? '—',
      },
    ];
  }, [investor]);

  const actions: EntityDetailAction[] = useMemo(() => {
    if (!investor || !investorId) return [];
    return [
      {
        id: 'activate',
        label: 'Activate',
        permission: 'investor.activate',
        allowedStatuses: [
          InvestorStatus.Draft,
          InvestorStatus.PendingKyc,
          InvestorStatus.Inactive,
        ],
        disabled: !ui?.canActivate || activate.isPending,
        loading: activate.isPending,
        variant: 'contained',
        color: 'success',
        onClick: () => {
          void activate
            .mutateAsync(investorId)
            .then(() => success('Investor activated'))
            .catch((err: unknown) => notifyError(getErrorMessage(err)));
        },
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        permission: 'investor.activate',
        allowedStatuses: [InvestorStatus.Active],
        disabled: !ui?.canDeactivate || deactivate.isPending,
        loading: deactivate.isPending,
        color: 'error',
        onClick: () => {
          void deactivate
            .mutateAsync(investorId)
            .then(() => success('Investor deactivated'))
            .catch((err: unknown) => notifyError(getErrorMessage(err)));
        },
      },
    ];
  }, [
    investor,
    investorId,
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
        title="Investor denied"
        message="You do not have access to this investor record."
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
      notFound={!detailQuery.isLoading && !detailQuery.error && !investor}
      permissionTitle="Investor unavailable"
      permissionMessage="You need the investor.view permission to open this investor."
      notFoundTitle="Investor not found"
      notFoundDescription="This investor may have been removed or the id is invalid."
      header={
        investor ? (
          <DetailHeader
            title={investor.legalName}
            code={investor.investorCode}
            subtitle={investor.contact?.email ?? undefined}
            backTo="/capital/investors"
            backLabel="Investors"
            meta={
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                <Chip
                  size="small"
                  label={investorStatusLabel(investor.status)}
                  color={
                    investor.status === InvestorStatus.Active
                      ? 'success'
                      : 'default'
                  }
                />
                <KycStatusChip status={investor.kycStatus} />
              </Stack>
            }
          />
        ) : undefined
      }
      summary={
        investor ? <SummaryCards fields={summaryFields} /> : undefined
      }
      actionBar={
        investor ? (
          <EntityActionBar
            actions={actions}
            status={investor.status}
            hasPermission={hasPermission}
            emptyHint="No activate/deactivate actions for this status and your permissions. KYC actions are on the KYC tab."
          />
        ) : undefined
      }
      tabs={
        investor ? (
          <EntityDetailTabs
            hasPermission={hasPermission}
            value={tab}
            onChange={setTab}
            tabs={[
              {
                id: 'overview',
                label: 'Overview',
                content: (
                  <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">
                      Identity and contact. Bank and nominee are on separate
                      tabs; account numbers stay masked by default.
                    </Typography>
                    <Typography variant="subtitle2">Identity</Typography>
                    <Typography variant="body2">
                      Type: {investorTypeLabel(investor.investorType)}
                    </Typography>
                    <Typography variant="body2">
                      PAN: {investor.pan ?? '—'}
                    </Typography>
                    <Typography variant="body2">
                      GSTIN: {investor.gstin ?? '—'}
                    </Typography>
                    <Typography variant="body2">
                      CIN: {investor.cin ?? '—'}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ pt: 1 }}>
                      Contact
                    </Typography>
                    <Typography variant="body2">
                      Email: {investor.contact?.email ?? '—'}
                    </Typography>
                    <Typography variant="body2">
                      Phone: {investor.contact?.phone ?? '—'}
                    </Typography>
                    <Typography variant="body2">
                      Address:{' '}
                      {[
                        investor.contact?.addressLine1,
                        investor.contact?.city,
                        investor.contact?.state,
                        investor.contact?.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </Typography>
                  </Stack>
                ),
              },
              {
                id: 'bank',
                label: 'Bank',
                content: (
                  <InvestorBankCard
                    investor={investor}
                    canView={caps.canView}
                  />
                ),
              },
              {
                id: 'nominee',
                label: 'Nominee',
                content: (
                  <InvestorNomineeCard
                    investor={investor}
                    canView={caps.canView}
                  />
                ),
              },
              {
                id: 'documents',
                label: 'Documents',
                content: (
                  <InvestorDocumentPanel
                    documents={docsQuery.data ?? []}
                    loading={docsQuery.isLoading || docsQuery.isFetching}
                    error={docsQuery.error}
                    onRetry={() => void docsQuery.refetch()}
                    canView={caps.canView}
                    canUpload={caps.canUploadDocument}
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
                ),
              },
              {
                id: 'kyc',
                label: 'KYC',
                content: (
                  <InvestorKycChecklist
                    investor={investor}
                    canView={caps.canView}
                    canVerifyKyc={caps.canVerifyKyc}
                    documentCategories={docCategories}
                  />
                ),
              },
            ]}
          />
        ) : undefined
      }
    />
  );
}
