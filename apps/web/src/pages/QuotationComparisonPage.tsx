import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  ErrorAlert,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate } from '@/format';
import { DocumentActionMenu, quotationComparisonPdfSource } from '@/print-pdf';
import { ComparisonStatusChip } from '@/quotation-comparisons/ComparisonStatusChip';
import { RecommendationPanel } from '@/quotation-comparisons/RecommendationPanel';
import { resolveQuotationComparisonCapabilities } from '@/quotation-comparisons/roleAccess';
import {
  useCancelQuotationComparison,
  useComparisonForPurchaseRequest,
  useGenerateQuotationComparison,
  useRecommendQuotationComparison,
  useSubmitQuotationComparisonApproval,
} from '@/quotation-comparisons/useQuotationComparisons';
import { VendorComparisonMatrix } from '@/quotation-comparisons/VendorComparisonMatrix';
import {
  canEditRecommendation,
  resolveComparisonActions,
} from '@/quotation-comparisons/workflowActions';

/**
 * Quotation comparison — `/procurement/quotation-comparisons/:prId`
 * (Micro Phase 064).
 *
 * Nest: generate / list / get / recommend / submit-approval / export-pdf / cancel
 * Permissions: `quotation.compare`, `quotation.recommend`
 * (final approve via Approvals inbox — no Nest `quotation.approve`).
 */
export function QuotationComparisonPage() {
  const { prId = '' } = useParams<{ prId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveQuotationComparisonCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const canView = Boolean(access) && caps.canView;
  const comparisonQuery = useComparisonForPurchaseRequest(
    prId || null,
    canView && Boolean(prId),
  );
  const comparison = comparisonQuery.data ?? null;

  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!comparison) {
      setSelectedQuotationId(null);
      return;
    }
    setSelectedQuotationId(
      comparison.recommendedQuotationId ??
        comparison.lowestLandedCostQuotationId ??
        comparison.vendors[0]?.quotationId ??
        null,
    );
  }, [comparison]);

  const generate = useGenerateQuotationComparison(prId);
  const recommend = useRecommendQuotationComparison(prId);
  const submitApproval = useSubmitQuotationComparisonApproval(prId);
  const cancel = useCancelQuotationComparison(prId);

  const actions = useMemo(
    () => resolveComparisonActions(comparison, caps),
    [comparison, caps],
  );

  const projectMismatch =
    comparison != null &&
    selectedProjectId != null &&
    comparison.projectId !== selectedProjectId;

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Quotation comparison unavailable"
        message="You need the quotation.compare permission to view landed-cost comparisons."
      />
    );
  }

  if (comparisonQuery.error && isForbiddenError(comparisonQuery.error)) {
    return (
      <PermissionDenied
        error={comparisonQuery.error}
        title="Quotation comparison denied"
        message="You do not have access to quotation comparisons for this purchase request."
      />
    );
  }

  if (comparisonQuery.isError && !comparisonQuery.isFetching) {
    return (
      <RetryPanel
        error={comparisonQuery.error}
        forceRetry
        onRetry={() => {
          void comparisonQuery.refetch();
        }}
      />
    );
  }

  return (
    <Stack spacing={2.5} data-testid="quotation-comparison-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Purchase request · {prId || '—'}
            {selectedProject ? ` · ${selectedProject.projectName}` : ''}
          </Typography>
          {comparison ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Typography variant="h6" component="h2">
                {comparison.comparisonNumber}
              </Typography>
              <ComparisonStatusChip status={comparison.status} />
            </Stack>
          ) : null}
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          {actions.includes('generate') ? (
            <Button
              variant="contained"
              disabled={generate.isPending || !prId}
              onClick={() => {
                void (async () => {
                  try {
                    await generate.mutateAsync({ purchaseRequestId: prId });
                    success('Comparison statement generated');
                  } catch (err) {
                    notifyError(getErrorMessage(err));
                  }
                })();
              }}
              data-testid="generate-comparison-btn"
            >
              {generate.isPending ? 'Generating…' : 'Generate comparison'}
            </Button>
          ) : null}

          {comparison && actions.includes('export_pdf') ? (
            <DocumentActionMenu
              source={quotationComparisonPdfSource({
                id: comparison.id,
                pdfPath: comparison.pdfPath,
                label: 'Comparison PDF',
              })}
              canViewEntity={caps.canExportPdf}
              buttonLabel="PDF"
            />
          ) : null}

          {actions.includes('open_approvals') ? (
            <Button
              component={RouterLink}
              to="/approvals"
              variant="outlined"
              data-testid="open-approvals-btn"
            >
              Open approvals
            </Button>
          ) : null}

          {comparison && actions.includes('cancel') ? (
            <Button
              color="inherit"
              disabled={cancel.isPending}
              onClick={() => {
                void (async () => {
                  try {
                    await cancel.mutateAsync(comparison.id);
                    success('Comparison cancelled');
                  } catch (err) {
                    notifyError(getErrorMessage(err));
                  }
                })();
              }}
              data-testid="cancel-comparison-btn"
            >
              Cancel
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Typography variant="body2">
        <Link
          component={RouterLink}
          to={
            prId
              ? `/procurement/purchase-requests/${encodeURIComponent(prId)}`
              : '/procurement/purchase-requests'
          }
          underline="hover"
          data-testid="back-to-purchase-request"
        >
          Back to purchase request
        </Link>
      </Typography>

      {projectMismatch ? (
        <Alert severity="warning" variant="outlined">
          This comparison belongs to another project. Switch the active project
          header to match before acting.
        </Alert>
      ) : null}

      {comparisonQuery.isLoading ? (
        <Typography color="text.secondary">Loading comparison…</Typography>
      ) : null}

      {!comparisonQuery.isLoading && !comparison ? (
        <EmptyState
          title="No comparison yet"
          description="Generate a landed-cost comparison once at least two vendor quotations exist for this purchase request."
          actionLabel={
            actions.includes('generate') ? 'Generate comparison' : undefined
          }
          onAction={
            actions.includes('generate')
              ? () => {
                  void (async () => {
                    try {
                      await generate.mutateAsync({ purchaseRequestId: prId });
                      success('Comparison statement generated');
                    } catch (err) {
                      notifyError(getErrorMessage(err));
                    }
                  })();
                }
              : undefined
          }
        />
      ) : null}

      {generate.isError ? (
        <ErrorAlert error={generate.error} title="Generate failed" />
      ) : null}

      {comparison ? (
        <>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Generated {formatDate(comparison.generatedAt)}
              {comparison.notes ? ` · ${comparison.notes}` : ''}
            </Typography>
            {comparison.approvalRequestId ? (
              <Typography variant="body2" color="text.secondary">
                Approval request: {comparison.approvalRequestId}
              </Typography>
            ) : null}
          </Stack>

          <VendorComparisonMatrix
            vendors={comparison.vendors}
            selectedQuotationId={selectedQuotationId}
            selectable={canEditRecommendation(comparison) && caps.canRecommend}
            onSelectQuotation={setSelectedQuotationId}
          />

          <RecommendationPanel
            comparison={comparison}
            selectedQuotationId={selectedQuotationId}
            onSelectQuotation={setSelectedQuotationId}
            canRecommend={caps.canRecommend}
            canSubmitApproval={caps.canSubmitApproval}
            editable={canEditRecommendation(comparison)}
            recommendPending={recommend.isPending}
            submitPending={submitApproval.isPending}
            onRecommend={async (input) => {
              try {
                await recommend.mutateAsync({
                  id: comparison.id,
                  input,
                });
                success('Vendor recommendation saved');
              } catch (err) {
                notifyError(getErrorMessage(err));
                throw err;
              }
            }}
            onSubmitApproval={async () => {
              try {
                await submitApproval.mutateAsync(comparison.id);
                success(
                  'Recommendation submitted for approval — complete approval in the Approvals inbox',
                );
              } catch (err) {
                notifyError(getErrorMessage(err));
                throw err;
              }
            }}
          />
        </>
      ) : null}
    </Stack>
  );
}
