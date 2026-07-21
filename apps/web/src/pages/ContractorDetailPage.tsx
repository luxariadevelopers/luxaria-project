import { useMemo, useState, type ReactNode } from 'react';
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
import { BlockContractorDialog } from '@/contractors/BlockContractorDialog';
import { ContractorBankCard } from '@/contractors/ContractorBankCard';
import { ContractorDocumentsPanel } from '@/contractors/ContractorDocumentsPanel';
import { ContractorPerformancePanel } from '@/contractors/ContractorPerformancePanel';
import { ContractorProjectsPanel } from '@/contractors/ContractorProjectsPanel';
import { EditContractorDrawer } from '@/contractors/EditContractorDrawer';
import {
  contractorStatusLabel,
  contractorTypeLabel,
  contractorVerificationLabel,
} from '@/contractors/labels';
import { toContractorListRow } from '@/contractors/listProjection';
import {
  CONTRACTOR_DETAIL_TAB_DEFS,
  resolveContractorCapabilities,
  type ContractorDetailTabId,
} from '@/contractors/roleAccess';
import { contractorUiState } from '@/contractors/contractorStatus';
import { ContractorStatus } from '@/contractors/types';
import {
  useActivateContractor,
  useBlockContractor,
  useContractorDetail,
  useContractorDocuments,
  useContractorPerformance,
  useContractorProjects,
  useVerifyContractor,
} from '@/contractors/useContractors';
import { formatDateTime } from '@/format';

/**
 * Contractor 360 — `/contractors/:contractorId`.
 *
 * APIs: GET /contractors/:id, documents, projects, performance;
 * POST verify / activate / block; PATCH update via edit drawer.
 */
export function ContractorDetailPage() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveContractorCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState<string>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useContractorDetail(contractorId, canView);
  const docsQuery = useContractorDocuments(
    contractorId,
    canView && tab === 'documents',
  );
  const projectsQuery = useContractorProjects(
    contractorId,
    canView && tab === 'projects',
  );
  const performanceQuery = useContractorPerformance(
    contractorId,
    canView && tab === 'performance',
  );

  const verify = useVerifyContractor(contractorId);
  const activate = useActivateContractor(contractorId);
  const block = useBlockContractor(contractorId);

  const contractor = detailQuery.data;
  const ui = contractor ? contractorUiState(contractor) : null;
  const listRow = contractor ? toContractorListRow(contractor) : null;

  const summaryFields = useMemo(() => {
    if (!contractor) return [];
    return [
      {
        id: 'type',
        label: 'Type',
        value: contractorTypeLabel(contractor.contractorType),
      },
      { id: 'gstin', label: 'GSTIN', value: contractor.gstin ?? '—' },
      { id: 'pan', label: 'PAN', value: contractor.pan ?? '—' },
      {
        id: 'contact',
        label: 'Contact',
        value:
          contractor.contact?.contactPerson ??
          contractor.contact?.phone ??
          '—',
      },
    ];
  }, [contractor]);

  const actions: EntityDetailAction[] = useMemo(() => {
    if (!contractor || !contractorId) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        permission: 'contractor.manage',
        allowedStatuses: [
          ContractorStatus.Draft,
          ContractorStatus.PendingVerification,
          ContractorStatus.Active,
          ContractorStatus.Inactive,
        ],
        disabled: !caps.canUpdate,
        onClick: () => setEditOpen(true),
      },
      {
        id: 'verify',
        label: 'Verify',
        permission: 'contractor.manage',
        allowedStatuses: [
          ContractorStatus.Draft,
          ContractorStatus.PendingVerification,
        ],
        disabled: !ui?.canVerify || verify.isPending,
        loading: verify.isPending,
        variant: 'contained',
        color: 'success',
        onClick: () => {
          void verify
            .mutateAsync({
              id: contractorId,
              input: { verified: true, notes: null },
            })
            .then(() => success('Contractor verified'))
            .catch((err: unknown) => notifyError(getErrorMessage(err)));
        },
      },
      {
        id: 'reject',
        label: 'Reject verification',
        permission: 'contractor.manage',
        allowedStatuses: [
          ContractorStatus.Draft,
          ContractorStatus.PendingVerification,
        ],
        disabled: !ui?.canVerify || verify.isPending,
        loading: verify.isPending,
        color: 'warning',
        onClick: () => {
          void verify
            .mutateAsync({
              id: contractorId,
              input: { verified: false, notes: null },
            })
            .then(() => success('Contractor verification rejected'))
            .catch((err: unknown) => notifyError(getErrorMessage(err)));
        },
      },
      {
        id: 'activate',
        label: 'Activate',
        permission: 'contractor.manage',
        allowedStatuses: [
          ContractorStatus.Draft,
          ContractorStatus.PendingVerification,
          ContractorStatus.Inactive,
        ],
        disabled: !ui?.canActivate || activate.isPending,
        loading: activate.isPending,
        variant: 'contained',
        color: 'success',
        onClick: () => {
          void activate
            .mutateAsync(contractorId)
            .then(() => success('Contractor activated'))
            .catch((err: unknown) => notifyError(getErrorMessage(err)));
        },
      },
      {
        id: 'block',
        label: 'Block',
        permission: 'contractor.manage',
        allowedStatuses: [
          ContractorStatus.Draft,
          ContractorStatus.PendingVerification,
          ContractorStatus.Active,
          ContractorStatus.Inactive,
        ],
        disabled: !ui?.canBlock || block.isPending,
        loading: block.isPending,
        color: 'error',
        onClick: () => setBlockOpen(true),
      },
    ];
  }, [
    contractor,
    contractorId,
    caps.canUpdate,
    ui?.canVerify,
    ui?.canActivate,
    ui?.canBlock,
    verify,
    activate,
    block.isPending,
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
        title="Contractor denied"
        message="You do not have access to this contractor record."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={!detailQuery.isLoading && !detailQuery.error && !contractor}
        permissionTitle="Contractor unavailable"
        permissionMessage="You need the contractor.view permission to open this contractor."
        notFoundTitle="Contractor not found"
        notFoundDescription="This contractor may have been removed or the id is invalid."
        header={
          contractor ? (
            <DetailHeader
              title={contractor.legalName}
              code={contractor.contractorCode}
              subtitle={
                contractor.tradeName ?? contractor.contact?.email ?? undefined
              }
              backTo="/contractors"
              backLabel="Contractors"
              meta={
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: 'wrap' }}
                >
                  <Chip
                    size="small"
                    label={contractorStatusLabel(contractor.status)}
                    color={
                      contractor.status === ContractorStatus.Active
                        ? 'success'
                        : contractor.status === ContractorStatus.Blocked
                          ? 'error'
                          : 'default'
                    }
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={contractorVerificationLabel(
                      contractor.verificationStatus,
                    )}
                  />
                </Stack>
              }
            />
          ) : undefined
        }
        summary={
          contractor ? <SummaryCards fields={summaryFields} /> : undefined
        }
        actionBar={
          contractor ? (
            <EntityActionBar
              actions={actions}
              status={contractor.status}
              hasPermission={hasPermission}
              emptyHint="No workflow actions are available for this contractor status."
            />
          ) : undefined
        }
        tabs={
          contractor ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={CONTRACTOR_DETAIL_TAB_DEFS.map((def) => {
                const id = def.id as ContractorDetailTabId;
                let content: ReactNode = null;
                switch (id) {
                  case 'overview':
                    content = (
                      <Stack spacing={1.5}>
                        <Typography variant="body2" color="text.secondary">
                          Identity, contact, labour licence, and verification
                          notes. Bank details are on the Bank tab.
                        </Typography>
                        <Typography variant="subtitle2">Identity</Typography>
                        <Typography variant="body2">
                          Legal name: {contractor.legalName}
                        </Typography>
                        <Typography variant="body2">
                          Trade name: {contractor.tradeName ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Type:{' '}
                          {contractorTypeLabel(contractor.contractorType)}
                        </Typography>
                        <Typography variant="body2">
                          GSTIN: {contractor.gstin ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          PAN: {contractor.pan ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Work categories:{' '}
                          {contractor.workCategories.length > 0
                            ? contractor.workCategories.join(', ')
                            : '—'}
                        </Typography>
                        <Typography variant="body2">
                          Rating:{' '}
                          {contractor.rating != null
                            ? String(contractor.rating)
                            : '—'}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ pt: 1 }}>
                          Contact
                        </Typography>
                        <Typography variant="body2">
                          Person: {contractor.contact?.contactPerson ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Email: {contractor.contact?.email ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Phone: {contractor.contact?.phone ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Alternate phone:{' '}
                          {contractor.contact?.alternatePhone ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Address:{' '}
                          {[
                            contractor.contact?.addressLine1,
                            contractor.contact?.addressLine2,
                            contractor.contact?.city,
                            contractor.contact?.state,
                            contractor.contact?.pincode,
                          ]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ pt: 1 }}>
                          Labour licence
                        </Typography>
                        <Typography variant="body2">
                          Number:{' '}
                          {contractor.labourLicence?.licenceNumber ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Issued by:{' '}
                          {contractor.labourLicence?.issuedBy ?? '—'}
                        </Typography>
                        <Typography variant="body2">
                          Valid from:{' '}
                          {contractor.labourLicence?.validFrom
                            ? formatDateTime(contractor.labourLicence.validFrom)
                            : '—'}
                        </Typography>
                        <Typography variant="body2">
                          Valid to:{' '}
                          {contractor.labourLicence?.validTo
                            ? formatDateTime(contractor.labourLicence.validTo)
                            : '—'}
                        </Typography>
                        {contractor.verificationNotes ? (
                          <Typography variant="body2">
                            Verification notes: {contractor.verificationNotes}
                          </Typography>
                        ) : null}
                        {contractor.notes ? (
                          <Typography variant="body2">
                            Notes: {contractor.notes}
                          </Typography>
                        ) : null}
                        {contractor.blockReason ? (
                          <Typography variant="body2" color="error">
                            Block reason: {contractor.blockReason}
                          </Typography>
                        ) : null}
                      </Stack>
                    );
                    break;
                  case 'bank':
                    content = (
                      <ContractorBankCard
                        contractor={contractor}
                        canView={caps.canView}
                      />
                    );
                    break;
                  case 'documents':
                    content = (
                      <ContractorDocumentsPanel
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
                      <ContractorProjectsPanel
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
                      <ContractorPerformancePanel
                        contractor={contractor}
                        performance={performanceQuery.data}
                        loading={
                          performanceQuery.isLoading ||
                          performanceQuery.isFetching
                        }
                        error={performanceQuery.error}
                        onRetry={() => void performanceQuery.refetch()}
                        canView={caps.canView}
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

      {caps.canUpdate ? (
        <EditContractorDrawer
          open={editOpen}
          contractor={listRow}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      <BlockContractorDialog
        open={blockOpen}
        contractor={listRow}
        loading={block.isPending}
        onClose={() => setBlockOpen(false)}
        onConfirm={async (reason) => {
          if (!contractorId) return;
          try {
            await block.mutateAsync({
              id: contractorId,
              input: { reason },
            });
            success('Contractor blocked');
            setBlockOpen(false);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
