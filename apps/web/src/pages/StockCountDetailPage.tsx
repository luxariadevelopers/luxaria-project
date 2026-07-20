import { useMemo, useState } from 'react';
import { Alert, Link, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
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
import { DocumentUploadPanel } from '@/documents';
import { formatDate } from '@/format';
import {
  AdjustmentPreview,
  buildAdjustmentPreview,
  CountGrid,
  resolveStockCountCapabilities,
  resolveStockCountRowActions,
  stockCountStatusLabel,
  StockCountStatusChip,
  StockCountStatusValues,
  type CountGridRow,
  useApproveStockCount,
  useCancelStockCount,
  usePostStockCount,
  useReviewStockCount,
  useStockCountDetail,
  useSubmitStockCount,
  useUpdateStockCount,
  validateCountGridRows,
} from '@/stock-counts';

/**
 * Stock count detail — `/inventory/stock-counts/:countId` (Micro Phase 072).
 */
export function StockCountDetailPage() {
  const { countId } = useParams<{ countId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveStockCountCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [tab, setTab] = useState('lines');
  const [editRows, setEditRows] = useState<CountGridRow[] | null>(null);
  const [approveComment, setApproveComment] = useState('');

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useStockCountDetail(countId, canView && projectReady);
  const count = detailQuery.data;

  const update = useUpdateStockCount();
  const submit = useSubmitStockCount();
  const review = useReviewStockCount();
  const approve = useApproveStockCount();
  const post = usePostStockCount();
  const cancel = useCancelStockCount();

  const allowed = count ? resolveStockCountRowActions(count, caps) : [];

  const gridRows: CountGridRow[] = useMemo(() => {
    if (editRows) return editRows;
    return (count?.items ?? []).map((item) => ({
      key: item.id || item.materialId,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      baseUnit: item.baseUnit,
      systemQuantity: item.systemQuantity,
      physicalQuantity: item.physicalQuantity,
      reason: item.reason ?? '',
      photo: item.photo ?? '',
    }));
  }, [count, editRows]);

  const preview = useMemo(
    () =>
      buildAdjustmentPreview(
        gridRows.map((r) => ({
          materialId: r.materialId,
          materialCode: r.materialCode,
          materialName: r.materialName,
          baseUnit: r.baseUnit,
          systemQuantity: r.systemQuantity,
          physicalQuantity: r.physicalQuantity,
          reason: r.reason,
        })),
      ),
    [gridRows],
  );

  const ledgerLinks = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const item of count?.items ?? []) {
      map.set(item.materialId, item.stockLedgerEntryId);
    }
    return map;
  }, [count]);

  const summaryFields = useMemo(() => {
    if (!count) return [];
    return [
      {
        id: 'date',
        label: 'Count date',
        value: formatDate(count.countDate),
      },
      {
        id: 'location',
        label: 'Location',
        value: count.location || '—',
      },
      {
        id: 'status',
        label: 'Status',
        value: stockCountStatusLabel(count.status),
      },
      {
        id: 'director',
        label: 'Large variance',
        value: count.requiresDirectorApproval
          ? 'Director approve required'
          : 'No',
      },
      {
        id: 'lines',
        label: 'Lines',
        value: String(count.items.length),
      },
      {
        id: 'journal',
        label: 'Journal',
        value: count.journalEntryId ?? count.journalSkippedReason ?? '—',
      },
    ];
  }, [count]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      success(label);
      setEditRows(null);
      await detailQuery.refetch();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const saveDraft = async () => {
    if (!count) return;
    const check = validateCountGridRows(gridRows);
    if (!check.ok) {
      notifyError(check.fieldErrors.form ?? 'Fix count line errors');
      return;
    }
    await run('Draft saved', () =>
      update.mutateAsync({
        id: count.id,
        input: {
          items: gridRows.map((r) => ({
            materialId: r.materialId,
            physicalQuantity: r.physicalQuantity,
            reason: r.reason.trim() || null,
            photo: r.photo.trim() || null,
          })),
        },
      }),
    );
  };

  const actions: EntityDetailAction[] = count
    ? [
        {
          id: 'save',
          label: 'Save draft',
          permission: 'stock.adjust',
          allowedStatuses: [StockCountStatusValues.Draft],
          onClick: () => void saveDraft(),
          disabled: !allowed.includes('edit'),
        },
        {
          id: 'submit',
          label: 'Submit',
          permission: 'stock.adjust',
          allowedStatuses: [StockCountStatusValues.Draft],
          color: 'primary',
          onClick: () =>
            void run('Stock count submitted', () =>
              submit.mutateAsync(count.id),
            ),
          disabled: !allowed.includes('submit'),
        },
        {
          id: 'review',
          label: 'Mark reviewed',
          permission: 'stock.adjust',
          allowedStatuses: [StockCountStatusValues.Submitted],
          onClick: () =>
            void run('Marked reviewed', () => review.mutateAsync(count.id)),
          disabled: !allowed.includes('review'),
        },
        {
          id: 'approve',
          label: 'Approve',
          permission: count.requiresDirectorApproval
            ? 'stock.count.director_approve'
            : 'stock.adjust',
          allowedStatuses: [StockCountStatusValues.Reviewed],
          color: 'success',
          onClick: () =>
            void run('Stock count approved', () =>
              approve.mutateAsync({
                id: count.id,
                input: { comment: approveComment.trim() || null },
              }),
            ),
          disabled: !allowed.includes('approve'),
        },
        {
          id: 'post',
          label: 'Post adjustment',
          permission: 'stock.adjust',
          allowedStatuses: [StockCountStatusValues.Approved],
          color: 'success',
          onClick: () =>
            void run('Stock adjustments posted', () =>
              post.mutateAsync(count.id),
            ),
          disabled: !allowed.includes('post'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'stock.adjust',
          allowedStatuses: [
            StockCountStatusValues.Draft,
            StockCountStatusValues.Submitted,
            StockCountStatusValues.Reviewed,
            StockCountStatusValues.Approved,
          ],
          color: 'error',
          variant: 'outlined',
          onClick: () =>
            void run('Stock count cancelled', () =>
              cancel.mutateAsync(count.id),
            ),
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Stock count unavailable"
        message="You need the stock.view permission to open this stock count."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Stock count unavailable"
        message="The server denied access to this stock count (403)."
      />
    );
  }

  const editable = allowed.includes('edit');

  return (
    <EntityDetailLayout
      canView={canView}
      projectReady={projectReady}
      loading={detailQuery.isLoading}
      error={detailQuery.error}
      onRetry={() => void detailQuery.refetch()}
      notFound={!detailQuery.isLoading && !detailQuery.error && !count}
      permissionTitle="Stock count unavailable"
      permissionMessage="You need the stock.view permission to open this stock count."
      projectMissingTitle="Project required"
      projectMissingDescription="Select a project in the header before opening a stock count."
      notFoundTitle="Stock count not found"
      notFoundDescription="This count may belong to another project, or the id is invalid."
      header={
        count ? (
          <DetailHeader
            title={count.countNumber}
            subtitle={stockCountStatusLabel(count.status)}
            backTo="/inventory/stock-counts"
            backLabel="Stock counts"
            meta={<StockCountStatusChip status={count.status} />}
          />
        ) : undefined
      }
      actionBar={
        count ? (
          <EntityActionBar
            actions={actions}
            status={count.status}
            hasPermission={hasPermission}
          />
        ) : undefined
      }
      summary={count ? <SummaryCards fields={summaryFields} /> : undefined}
      tabs={
        count ? (
          <EntityDetailTabs
            hasPermission={hasPermission}
            value={tab}
            onChange={setTab}
            tabs={[
              {
                id: 'lines',
                label: 'Count lines',
                content: (
                  <Stack spacing={2}>
                    {count.requiresDirectorApproval ? (
                      <Alert
                        severity="warning"
                        data-testid="large-variance-banner"
                      >
                        Large variances — approval requires{' '}
                        <strong>stock.count.director_approve</strong>.
                      </Alert>
                    ) : null}
                    <CountGrid
                      rows={gridRows}
                      readOnly={!editable}
                      onChange={editable ? setEditRows : undefined}
                      ledgerLinks={
                        count.status ===
                        StockCountStatusValues.AdjustmentPosted
                          ? ledgerLinks
                          : undefined
                      }
                    />
                    {count.status === StockCountStatusValues.Reviewed ? (
                      <TextField
                        size="small"
                        label="Approve comment (optional)"
                        value={approveComment}
                        onChange={(e) => setApproveComment(e.target.value)}
                        fullWidth
                      />
                    ) : null}
                    {count.notes ? (
                      <Typography variant="body2" color="text.secondary">
                        Notes: {count.notes}
                      </Typography>
                    ) : null}
                  </Stack>
                ),
              },
              {
                id: 'preview',
                label: 'Adjustment preview',
                content: (
                  <AdjustmentPreview
                    lines={preview}
                    requiresDirectorApproval={
                      count.requiresDirectorApproval ||
                      preview.some((l) => l.isLargeVariance)
                    }
                  />
                ),
              },
              {
                id: 'photos',
                label: 'Photos',
                content: (
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      Evidence photos are stored as document ids on each line
                      (`photo`). Upload here, then paste the document id into
                      the line.
                    </Typography>
                    {editable && selectedProjectId ? (
                      <DocumentUploadPanel
                        context={{
                          module: 'stock-counts',
                          entityType: 'stock_count',
                          entityId: count.id,
                          documentType: 'count_photo',
                          projectId: selectedProjectId,
                        }}
                        title="Upload count photos"
                      />
                    ) : (
                      <Typography variant="body2">
                        Line photo ids:{' '}
                        {count.items
                          .map((i) => i.photo)
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </Typography>
                    )}
                    <Link
                      component={RouterLink}
                      to="/inventory/stock-ledger"
                      variant="body2"
                    >
                      Open stock ledger
                    </Link>
                  </Stack>
                ),
              },
            ]}
          />
        ) : undefined
      }
    />
  );
}
