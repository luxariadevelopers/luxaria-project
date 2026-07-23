import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
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
import {
  ExpenseCategoryStatus,
  fetchExpenseCategories,
} from '@/expense-categories';
import { BillPreview } from '@/expenses/BillPreview';
import { buildExpenseTimeline } from '@/expenses/buildExpenseTimeline';
import {
  ExpenseActionDialog,
  type ExpenseDialogMode,
} from '@/expenses/ExpenseActionDialog';
import { ExpenseStatusChip } from '@/expenses/ExpenseStatusChip';
import { JournalLink } from '@/expenses/JournalLink';
import { MapLocation } from '@/expenses/MapLocation';
import { resolveExpenseCapabilities } from '@/expenses/roleAccess';
import {
  assertSignatureReady,
  hasSignatureAttachment,
} from '@/expenses/signatureRequired';
import { SignaturesPanel } from '@/expenses/SignaturesPanel';
import {
  SiteExpenseAttachmentType,
} from '@/expenses/types';
import {
  useApproveSiteExpenseVoucher,
  useCancelSiteExpenseVoucher,
  usePostSiteExpenseVoucher,
  useRejectSiteExpenseVoucher,
  useReturnSiteExpenseVoucher,
  useSiteExpenseVoucherDetail,
  useSubmitSiteExpenseVoucher,
  useUpdateSiteExpenseVoucher,
  useVerifySiteExpenseVoucher,
} from '@/expenses/useExpenses';
import { VoucherSummary } from '@/expenses/VoucherSummary';
import {
  isExpenseEditable,
  isExpenseEvidenceReadOnly,
  isExpensePosted,
  resolveExpenseDetailActions,
} from '@/expenses/workflowActions';
import { WorkflowTimeline } from '@/workflow-timeline';

/**
 * Site expense voucher detail — `/accounting/expenses/:expenseId`
 *
 * Nest: GET detail · PATCH (signatures) · POST submit/verify/approve/…
 * Posted vouchers are immutable — evidence is display-only.
 */
export function ExpenseDetailPage() {
  const { expenseId = '' } = useParams<{ expenseId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveExpenseCapabilities(hasPermission);
  const { projects } = useProject();
  const { success, error: notifyError } = useNotify();
  const [dialogMode, setDialogMode] = useState<ExpenseDialogMode | null>(null);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useSiteExpenseVoucherDetail(expenseId || null, canView);
  const voucher = detailQuery.data;

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories', 'detail-rules', voucher?.expenseCategoryId],
    queryFn: () =>
      fetchExpenseCategories({
        page: 1,
        limit: 200,
        status: ExpenseCategoryStatus.Active,
      }),
    enabled: Boolean(voucher?.expenseCategoryId),
    staleTime: 60_000,
    retry: false,
  });

  const requiresSignature = Boolean(
    categoriesQuery.data?.find((c) => c.id === voucher?.expenseCategoryId)
      ?.requiresSignature,
  );

  const verify = useVerifySiteExpenseVoucher();
  const approve = useApproveSiteExpenseVoucher();
  const post = usePostSiteExpenseVoucher();
  const reject = useRejectSiteExpenseVoucher();
  const returnVoucher = useReturnSiteExpenseVoucher();
  const cancel = useCancelSiteExpenseVoucher();
  const update = useUpdateSiteExpenseVoucher();
  const submit = useSubmitSiteExpenseVoucher();

  const allowed = voucher
    ? resolveExpenseDetailActions(voucher, caps)
    : [];

  const projectLabel = useMemo(() => {
    if (!voucher) return '—';
    const p = projects.find((x) => x.id === voucher.projectId);
    if (!p) return voucher.projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [voucher, projects]);

  const busy =
    verify.isPending ||
    approve.isPending ||
    post.isPending ||
    reject.isPending ||
    returnVoucher.isPending ||
    cancel.isPending ||
    update.isPending ||
    submit.isPending;

  const editable = voucher ? isExpenseEditable(voucher) : false;

  const actions: EntityDetailAction[] = voucher
    ? [
        {
          id: 'submit',
          label: 'Submit',
          permission: 'expense.create',
          allowedStatuses: ['draft', 'returned'],
          color: 'primary',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              const sigCheck = assertSignatureReady({
                requiresSignature,
                hasSignature: hasSignatureAttachment(voucher.attachments),
              });
              if (!sigCheck.ok) {
                notifyError(sigCheck.error);
                return;
              }
              try {
                await submit.mutateAsync(voucher.id);
                success('Expense voucher submitted for review');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: submit.isPending,
          disabled: !allowed.includes('submit'),
        },
        {
          id: 'verify',
          label: 'Verify',
          permission: 'expense.approve',
          allowedStatuses: ['submitted'],
          color: 'primary',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await verify.mutateAsync(voucher.id);
                success('Expense voucher verified');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: verify.isPending,
          disabled: !allowed.includes('verify'),
        },
        {
          id: 'approve',
          label: 'Approve',
          permission: 'expense.approve',
          allowedStatuses: ['verified'],
          color: 'success',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await approve.mutateAsync(voucher.id);
                success('Expense voucher approved');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: approve.isPending,
          disabled: !allowed.includes('approve'),
        },
        {
          id: 'post',
          label: 'Post',
          permission: 'expense.post',
          allowedStatuses: ['approved'],
          color: 'success',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await post.mutateAsync(voucher.id);
                success(
                  'Expense posted — voucher is now immutable; journal created',
                );
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: post.isPending,
          disabled: !allowed.includes('post'),
        },
        {
          id: 'reject',
          label: 'Reject',
          permission: 'expense.approve',
          allowedStatuses: ['submitted', 'verified'],
          color: 'error',
          onClick: () => setDialogMode('reject'),
          disabled: !allowed.includes('reject'),
        },
        {
          id: 'return',
          label: 'Return',
          permission: 'expense.approve',
          allowedStatuses: ['submitted', 'verified'],
          onClick: () => setDialogMode('return'),
          disabled: !allowed.includes('return'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'expense.create',
          allowedStatuses: [
            'draft',
            'submitted',
            'verified',
            'approved',
            'returned',
          ],
          color: 'error',
          variant: 'outlined',
          onClick: () => setDialogMode('cancel'),
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () => (voucher ? buildExpenseTimeline(voucher) : []),
    [voucher],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Expense unavailable"
        message="You need the expense.view permission to open this voucher."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Expense denied"
        message="The server denied access to this expense voucher (403)."
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
          !detailQuery.isLoading && !detailQuery.error && !voucher
        }
        permissionTitle="Expense unavailable"
        permissionMessage="You need the expense.view permission to open this voucher."
        notFoundTitle="Expense voucher not found"
        notFoundDescription="This expense id is invalid or the voucher was removed."
        header={
          voucher ? (
            <DetailHeader
              title="Site expense voucher"
              code={voucher.voucherNumber}
              subtitle={voucher.purpose}
              backTo="/accounting/expenses"
              backLabel="Expenses"
              meta={<ExpenseStatusChip status={voucher.status} />}
            />
          ) : undefined
        }
        actionBar={
          voucher ? (
            <EntityActionBar
              actions={actions}
              status={voucher.status}
              hasPermission={hasPermission}
              emptyHint="No submit / verify / approve / post / reject actions for this status and your permissions. Posted vouchers are immutable."
            />
          ) : undefined
        }
        summary={
          voucher ? (
            <VoucherSummary voucher={voucher} projectLabel={projectLabel} />
          ) : undefined
        }
        timeline={
          voucher ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              title="Lifecycle timeline"
            />
          ) : undefined
        }
      >
        {voucher ? (
          <Stack spacing={3} data-testid="expense-detail-body">
            {isExpensePosted(voucher) ? (
              <Alert severity="success" variant="outlined">
                Posted — evidence and amounts are immutable. Review only; do not
                alter approved attachments.
              </Alert>
            ) : null}
            <BillPreview voucher={voucher} />
            <SignaturesPanel
              voucher={voucher}
              editable={editable && !isExpenseEvidenceReadOnly(voucher.status)}
              requiresSignature={requiresSignature}
              saving={update.isPending}
              onAttachSignature={async (doc) => {
                try {
                  const prior = voucher.attachments.filter(
                    (a) => a.type !== SiteExpenseAttachmentType.Signature,
                  );
                  await update.mutateAsync({
                    id: voucher.id,
                    input: {
                      attachments: [
                        ...prior.map((a) => ({
                          type: a.type,
                          documentId: a.documentId,
                          fileName: a.fileName,
                          filePath: a.filePath,
                          mimeType: a.mimeType,
                        })),
                        {
                          type: SiteExpenseAttachmentType.Signature,
                          documentId: doc.id,
                          fileName: doc.originalFileName || doc.fileName,
                          mimeType: doc.mimeType,
                        },
                      ],
                    },
                  });
                  success('Signature attached to expense voucher');
                } catch (err) {
                  notifyError(getErrorMessage(err));
                }
              }}
            />
            <MapLocation voucher={voucher} />
            <JournalLink voucher={voucher} />
            <Typography variant="caption" color="text.secondary">
              Category id: {voucher.expenseCategoryId} · Petty cash account:{' '}
              {voucher.pettyCashAccountId}
              {voucher.boqItemId ? ` · BOQ ${voucher.boqItemId}` : ''}
            </Typography>
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <ExpenseActionDialog
        open={dialogMode != null}
        mode={dialogMode}
        voucherNumber={voucher?.voucherNumber}
        loading={busy}
        onClose={() => setDialogMode(null)}
        onReject={async (reason) => {
          if (!voucher) return;
          try {
            await reject.mutateAsync({ id: voucher.id, input: { reason } });
            success('Expense voucher rejected');
            setDialogMode(null);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onReturn={async (comment) => {
          if (!voucher) return;
          try {
            await returnVoucher.mutateAsync({
              id: voucher.id,
              input: { comment: comment ?? null },
            });
            success('Expense voucher returned for correction');
            setDialogMode(null);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onCancel={async (cancellationReason) => {
          if (!voucher) return;
          try {
            await cancel.mutateAsync({
              id: voucher.id,
              input: { cancellationReason },
            });
            success('Expense voucher cancelled');
            setDialogMode(null);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />
    </>
  );
}
