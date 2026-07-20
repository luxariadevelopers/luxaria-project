import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import { AgreementDocumentPanel } from '@/contractor-agreements/AgreementDocumentPanel';
import {
  AgreementFormDrawer,
  type AgreementEntryMode,
} from '@/contractor-agreements/AgreementFormDrawer';
import { AgreementStatusChip } from '@/contractor-agreements/AgreementStatusChip';
import { AmendAgreementDialog } from '@/contractor-agreements/AmendAgreementDialog';
import { RejectAgreementDialog } from '@/contractor-agreements/RejectAgreementDialog';
import { TerminateAgreementDialog } from '@/contractor-agreements/TerminateAgreementDialog';
import { VersionHistoryTable } from '@/contractor-agreements/VersionHistoryTable';
import {
  agreementStatusLabel,
  billingCycleLabel,
} from '@/contractor-agreements/labels';
import { resolveContractorAgreementCapabilities } from '@/contractor-agreements/roleAccess';
import {
  useAgreementVersions,
  useApproveContractorAgreement,
  useContractorAgreementDetail,
  useSubmitContractorAgreement,
} from '@/contractor-agreements/useContractorAgreements';
import { resolveAgreementRowActions } from '@/contractor-agreements/workflowActions';

/**
 * Contractor agreement detail — `/contractors/agreements/:agreementId`.
 */
export function ContractorAgreementDetailPage() {
  const { agreementId } = useParams<{ agreementId: string }>();
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveContractorAgreementCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('overview');
  const [drawerMode, setDrawerMode] = useState<AgreementEntryMode>('edit');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useContractorAgreementDetail(
    agreementId,
    canView && projectReady,
  );
  const agreement = detailQuery.data;

  const versionsQuery = useAgreementVersions(
    agreement?.agreementNumber,
    selectedProjectId ?? undefined,
    canView && projectReady && Boolean(agreement?.agreementNumber),
  );

  const submit = useSubmitContractorAgreement();
  const approve = useApproveContractorAgreement();

  const summaryFields = useMemo(() => {
    if (!agreement) return [];
    return [
      {
        id: 'value',
        label: 'Agreed value',
        value: formatInr(agreement.agreedRates),
      },
      {
        id: 'manpower',
        label: 'Manpower',
        value: String(agreement.manpowerCommitment),
      },
      {
        id: 'retention',
        label: 'Retention',
        value: `${agreement.retentionPercentage}%`,
      },
      {
        id: 'billing',
        label: 'Billing',
        value: billingCycleLabel(agreement.billingCycle),
      },
      {
        id: 'start',
        label: 'Start',
        value: formatDate(agreement.startDate),
      },
      {
        id: 'end',
        label: 'End',
        value: formatDate(agreement.endDate),
      },
      {
        id: 'version',
        label: 'Version',
        value: `v${agreement.version}`,
      },
    ];
  }, [agreement]);

  const allowed = agreement
    ? resolveAgreementRowActions(agreement, caps, versionsQuery.data ?? [])
    : [];

  const actions: EntityDetailAction[] = agreement
    ? [
        {
          id: 'edit',
          label: 'Edit draft',
          permission: 'contractor_agreement.manage',
          allowedStatuses: ['draft', 'rejected'],
          onClick: () => {
            setDrawerMode('edit');
            setDrawerOpen(true);
          },
          disabled: !allowed.includes('edit'),
        },
        {
          id: 'submit',
          label: 'Submit',
          permission: 'contractor_agreement.manage',
          allowedStatuses: ['draft', 'rejected'],
          onClick: () => {
            void (async () => {
              try {
                await submit.mutateAsync(agreement.id);
                success('Agreement submitted');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: submit.isPending,
          disabled: !allowed.includes('submit'),
        },
        {
          id: 'approve',
          label: 'Approve',
          permission: 'contractor_agreement.approve',
          allowedStatuses: ['pending_approval'],
          color: 'success',
          onClick: () => {
            void (async () => {
              try {
                await approve.mutateAsync({ id: agreement.id });
                success('Agreement approved');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: approve.isPending,
          disabled: !allowed.includes('approve'),
        },
        {
          id: 'reject',
          label: 'Reject',
          permission: 'contractor_agreement.approve',
          allowedStatuses: ['pending_approval'],
          color: 'error',
          variant: 'outlined',
          onClick: () => setRejectOpen(true),
          disabled: !allowed.includes('reject'),
        },
        {
          id: 'amend',
          label: 'Amend',
          permission: 'contractor_agreement.manage',
          allowedStatuses: ['active'],
          onClick: () => setAmendOpen(true),
          disabled: !allowed.includes('amend'),
        },
        {
          id: 'terminate',
          label: 'Terminate',
          permission: 'contractor_agreement.manage',
          allowedStatuses: ['active'],
          color: 'error',
          variant: 'outlined',
          onClick: () => setTerminateOpen(true),
          disabled: !allowed.includes('terminate'),
        },
        {
          id: 'document',
          label: 'Attach document',
          permission: 'contractor_agreement.manage',
          allowedStatuses: ['draft', 'rejected'],
          onClick: () => setDocOpen(true),
          disabled: !allowed.includes('attach_document'),
        },
      ]
    : [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Agreement unavailable"
        message="You need the contractor_agreement.view permission."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Agreement unavailable"
        message="The server denied access to this agreement (403)."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={projectReady}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !agreement
        }
        permissionTitle="Agreement unavailable"
        permissionMessage="You need contractor_agreement.view to open agreements."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project before opening contractor agreements."
        notFoundTitle="Agreement not found"
        notFoundDescription="This agreement may belong to another project or the id is invalid."
        header={
          agreement ? (
            <DetailHeader
              title={agreement.agreementNumber}
              code={`v${agreement.version}`}
              subtitle={agreementStatusLabel(agreement.status)}
              backTo="/contractors/agreements"
              backLabel="Agreements"
              meta={<AgreementStatusChip status={agreement.status} />}
            />
          ) : undefined
        }
        actionBar={
          agreement ? (
            <EntityActionBar
              actions={actions}
              status={agreement.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={
          agreement ? <SummaryCards fields={summaryFields} /> : undefined
        }
        tabs={
          agreement ? (
            <EntityDetailTabs
              hasPermission={hasPermission}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  content: (
                    <Stack spacing={2}>
                      <Typography variant="body1">
                        {agreement.workScope}
                      </Typography>
                      {agreement.notes ? (
                        <Typography variant="body2" color="text.secondary">
                          Notes: {agreement.notes}
                        </Typography>
                      ) : null}
                      {agreement.rejectionReason ? (
                        <Typography variant="body2" color="error">
                          Rejection: {agreement.rejectionReason}
                        </Typography>
                      ) : null}
                      {agreement.terminationReason ? (
                        <Typography variant="body2" color="error">
                          Termination: {agreement.terminationReason}
                        </Typography>
                      ) : null}
                    </Stack>
                  ),
                },
                {
                  id: 'scope',
                  label: 'Scope & rates',
                  content: (
                    <Stack spacing={1}>
                      {agreement.boqItems.map((line) => (
                        <Typography key={line.id} variant="body2">
                          {line.description} — {line.agreedQuantity}{' '}
                          {line.unit} @ {formatInr(line.agreedRate)} ={' '}
                          {formatInr(line.agreedValue)}
                        </Typography>
                      ))}
                      {agreement.skillMix.length > 0 ? (
                        <>
                          <Typography variant="subtitle2" sx={{ mt: 2 }}>
                            Skill mix
                          </Typography>
                          {agreement.skillMix.map((row) => (
                            <Typography key={row.skill} variant="body2">
                              {row.skill}: {row.headcount}
                            </Typography>
                          ))}
                        </>
                      ) : null}
                    </Stack>
                  ),
                },
                {
                  id: 'versions',
                  label: 'Versions',
                  content: (
                    <VersionHistoryTable
                      versions={versionsQuery.data ?? []}
                      currentId={agreement.id}
                    />
                  ),
                },
              ]}
            />
          ) : undefined
        }
      />

      {agreement && selectedProjectId ? (
        <>
          <AgreementFormDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            mode={drawerMode}
            projectId={selectedProjectId}
            agreement={agreement}
            canManage={caps.canManage}
          />
          <AgreementDocumentPanel
            open={docOpen}
            onClose={() => setDocOpen(false)}
            projectId={selectedProjectId}
            agreement={agreement}
            canUpload={caps.canManage}
          />
          <RejectAgreementDialog
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            agreement={agreement}
          />
          <TerminateAgreementDialog
            open={terminateOpen}
            onClose={() => setTerminateOpen(false)}
            agreement={agreement}
          />
          <AmendAgreementDialog
            open={amendOpen}
            onClose={() => setAmendOpen(false)}
            agreement={agreement}
            versions={versionsQuery.data ?? []}
            onAmended={(draft) =>
              navigate(`/contractors/agreements/${draft.id}`)
            }
          />
        </>
      ) : null}
    </>
  );
}
