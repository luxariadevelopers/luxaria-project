import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import { BillActionDialog, type BillDialogMode } from '@/running-bills/BillActionDialog';
import { BillDocumentsPanel } from '@/running-bills/BillDocumentsPanel';
import { buildBillTimeline } from '@/running-bills/buildBillTimeline';
import { ClaimCertifiedGrid } from '@/running-bills/ClaimCertifiedGrid';
import { DeductionsPanel } from '@/running-bills/DeductionsPanel';
import { formatBillingPeriod, raNumberLabel } from '@/running-bills/labels';
import { resolveRunningBillCapabilities } from '@/running-bills/roleAccess';
import { RunningBillStatusChip } from '@/running-bills/RunningBillStatusChip';
import {
  useCancelRunningBill,
  useDirectorApproveRunningBill,
  useEngineerVerifyRunningBill,
  useFinanceVerifyRunningBill,
  usePmCertifyRunningBill,
  useRejectRunningBill,
  useRunningBillDetail,
  useSubmitRunningBillClaim,
} from '@/running-bills/useRunningBills';
import { computeBillAmounts } from '@/running-bills/validation';
import { resolveRunningBillDetailActions } from '@/running-bills/workflowActions';
import { WorkflowTimeline } from '@/workflow-timeline';

/**
 * Running bill certification — `/contractors/running-bills/:id` (Micro Phase 095).
 *
 * Nest: detail · engineer-verify · pm-certify · finance-verify · director-approve
 * Permissions: running_bill.view / verify / certify / finance_verify / approve
 */
export function RunningBillDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveRunningBillCapabilities(hasPermission);
  const { projects } = useProject();
  const { success, error: notifyError } = useNotify();
  const [dialogMode, setDialogMode] = useState<BillDialogMode>(null);
  const [pendingAction, setPendingAction] = useState<
    'engineer_verify' | 'pm_certify' | 'finance_verify' | 'director_approve' | null
  >(null);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useRunningBillDetail(id || null, canView);
  const bill = detailQuery.data;

  const submit = useSubmitRunningBillClaim();
  const engineerVerify = useEngineerVerifyRunningBill();
  const pmCertify = usePmCertifyRunningBill();
  const financeVerify = useFinanceVerifyRunningBill();
  const directorApprove = useDirectorApproveRunningBill();
  const reject = useRejectRunningBill();
  const cancel = useCancelRunningBill();

  const allowed = bill
    ? resolveRunningBillDetailActions(bill, caps)
    : [];

  const projectLabel = useMemo(() => {
    if (!bill) return '—';
    const p = projects.find((x) => x.id === bill.projectId);
    if (!p) return bill.projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [bill, projects]);

  const amounts = bill
    ? computeBillAmounts({
        currentCertifiedValue: bill.currentCertifiedValue,
        advanceRecovery: bill.advanceRecovery,
        materialRecovery: bill.materialRecovery,
        retention: bill.retention,
        tds: bill.tds,
        penalty: bill.penalty,
        otherDeductions: bill.otherDeductions,
      })
    : null;

  const busy =
    submit.isPending ||
    engineerVerify.isPending ||
    pmCertify.isPending ||
    financeVerify.isPending ||
    directorApprove.isPending ||
    reject.isPending ||
    cancel.isPending;

  const actions: EntityDetailAction[] = bill
    ? [
        {
          id: 'submit',
          label: 'Submit claim',
          permission: 'running_bill.create',
          allowedStatuses: ['draft', 'rejected'],
          color: 'primary',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await submit.mutateAsync(bill.id);
                success('Claim submitted');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: submit.isPending,
          disabled: !allowed.includes('submit'),
        },
        {
          id: 'engineer_verify',
          label: 'Engineer verify',
          permission: 'running_bill.verify',
          allowedStatuses: ['claimed'],
          color: 'primary',
          variant: 'contained',
          onClick: () => {
            setPendingAction('engineer_verify');
            setDialogMode('note');
          },
          loading: engineerVerify.isPending,
          disabled: !allowed.includes('engineer_verify'),
        },
        {
          id: 'pm_certify',
          label: 'PM certify',
          permission: 'running_bill.certify',
          allowedStatuses: ['engineer_verified'],
          color: 'primary',
          variant: 'contained',
          onClick: () => {
            setPendingAction('pm_certify');
            setDialogMode('note');
          },
          loading: pmCertify.isPending,
          disabled: !allowed.includes('pm_certify'),
        },
        {
          id: 'finance_verify',
          label: 'Finance check',
          permission: 'running_bill.finance_verify',
          allowedStatuses: ['pm_certified'],
          color: 'primary',
          variant: 'contained',
          onClick: () => {
            setPendingAction('finance_verify');
            setDialogMode('note');
          },
          loading: financeVerify.isPending,
          disabled: !allowed.includes('finance_verify'),
        },
        {
          id: 'director_approve',
          label: 'Director approve',
          permission: 'running_bill.approve',
          allowedStatuses: ['finance_verified'],
          color: 'success',
          variant: 'contained',
          onClick: () => {
            setPendingAction('director_approve');
            setDialogMode('note');
          },
          loading: directorApprove.isPending,
          disabled: !allowed.includes('director_approve'),
        },
        {
          id: 'reject',
          label: 'Reject',
          permission: 'running_bill.verify',
          allowedStatuses: [
            'claimed',
            'engineer_verified',
            'pm_certified',
            'finance_verified',
          ],
          color: 'error',
          onClick: () => setDialogMode('reject'),
          disabled: !allowed.includes('reject'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'running_bill.create',
          allowedStatuses: ['draft', 'rejected'],
          color: 'error',
          variant: 'outlined',
          onClick: () => {
            void (async () => {
              try {
                await cancel.mutateAsync(bill.id);
                success('Running bill cancelled');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: cancel.isPending,
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () => (bill ? buildBillTimeline(bill) : []),
    [bill],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Running bill unavailable"
        message="You need the running_bill.view permission to open this bill."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Running bill denied"
        message="The server denied access to this running bill (403)."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !bill
        }
        permissionTitle="Running bill unavailable"
        permissionMessage="You need the running_bill.view permission to open this bill."
        notFoundTitle="Running bill not found"
        notFoundDescription="This bill id is invalid or the bill was removed."
        header={
          bill ? (
            <DetailHeader
              title="Running bill"
              code={bill.billNumber}
              subtitle={`${raNumberLabel(bill.raNumber)} · ${formatBillingPeriod(bill.billingPeriod.from, bill.billingPeriod.to)} · ${projectLabel}`}
              backTo="/contractors/running-bills"
              backLabel="Running bills"
              meta={<RunningBillStatusChip status={bill.status} />}
            />
          ) : undefined
        }
        actionBar={
          bill ? (
            <EntityActionBar
              actions={actions}
              status={bill.status}
              hasPermission={hasPermission}
              emptyHint="No verify / certify / finance / approve actions for this status and your permissions."
            />
          ) : undefined
        }
        summary={
          bill && amounts ? (
            <Stack spacing={0.5} data-testid="running-bill-summary">
              <Typography variant="body2">
                Current certified: {formatInr(bill.currentCertifiedValue)} · Net
                payable: {formatInr(bill.netPayable)} · Remaining:{' '}
                {formatInr(bill.remainingPayable)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Previous certified {formatInr(bill.previousCertifiedValue)} ·
                Cumulative {formatInr(bill.cumulativeValue)}
              </Typography>
            </Stack>
          ) : undefined
        }
        timeline={
          bill ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              title="Workflow timeline"
            />
          ) : undefined
        }
      >
        {bill && amounts ? (
          <Stack spacing={3} data-testid="running-bill-detail-body">
            {bill.status === 'rejected' && bill.rejectionReason ? (
              <Alert severity="warning">
                Rejected: {bill.rejectionReason}
              </Alert>
            ) : null}
            <ClaimCertifiedGrid bill={bill} />
            <DeductionsPanel
              amounts={amounts}
              previousCertifiedValue={bill.previousCertifiedValue}
              cumulativeValue={bill.cumulativeValue}
              advanceRecovery={String(bill.advanceRecovery)}
              materialRecovery={String(bill.materialRecovery)}
              retention={String(bill.retention)}
              tds={String(bill.tds)}
              penalty={String(bill.penalty)}
              otherDeductions={String(bill.otherDeductions)}
              onChange={() => undefined}
              readOnly
            />
            <BillDocumentsPanel bill={bill} />
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <BillActionDialog
        open={dialogMode != null}
        mode={dialogMode}
        billNumber={bill?.billNumber}
        loading={busy}
        title={
          pendingAction === 'engineer_verify'
            ? 'Engineer verification'
            : pendingAction === 'pm_certify'
              ? 'PM certification'
              : pendingAction === 'finance_verify'
                ? 'Finance check'
                : pendingAction === 'director_approve'
                  ? 'Director approval'
                  : undefined
        }
        onClose={() => {
          setDialogMode(null);
          setPendingAction(null);
        }}
        onReject={async (reason) => {
          if (!bill) return;
          try {
            await reject.mutateAsync({ id: bill.id, input: { reason } });
            success('Running bill rejected');
            setDialogMode(null);
            setPendingAction(null);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onConfirmNote={async (notes) => {
          if (!bill || !pendingAction) return;
          try {
            const input = { notes };
            if (pendingAction === 'engineer_verify') {
              await engineerVerify.mutateAsync({ id: bill.id, input });
              success('Engineer verified');
            } else if (pendingAction === 'pm_certify') {
              await pmCertify.mutateAsync({ id: bill.id, input });
              success('PM certified');
            } else if (pendingAction === 'finance_verify') {
              await financeVerify.mutateAsync({ id: bill.id, input });
              success('Finance verified');
            } else {
              await directorApprove.mutateAsync({ id: bill.id, input });
              success('Director approved');
            }
            setDialogMode(null);
            setPendingAction(null);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
