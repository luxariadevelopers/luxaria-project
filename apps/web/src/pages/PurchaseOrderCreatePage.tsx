import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { applyApiFieldErrors } from '@/components/forms';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import {
  POForm,
  PURCHASE_ORDER_ROUTES,
  assertItemsMatchApprovedSource,
  defaultPurchaseOrderFormValues,
  formValuesFromQuotation,
  purchaseOrderFormSchema,
  quotationToSourceLines,
  resolvePurchaseOrderCapabilities,
  shapeCreatePayload,
  shapeUpdatePayload,
  useCreatePurchaseOrder,
  useSubmitPurchaseOrder,
  useUpdatePurchaseOrder,
  type PurchaseOrderFormValues,
} from '@/purchase-orders';
import { VendorQuotationStatus } from '@/quotations/types';
import { useVendorQuotationDetail } from '@/quotations/useQuotations';

/**
 * Create purchase order from approved sourcing —
 * `/procurement/purchase-orders/new` (Micro Phase 066).
 *
 * Nest: `POST /purchase-orders` + `PATCH /:id` + `POST …/submit-approval`
 * Permission: `purchase.order` (catalog has no `purchase_order.create` /
 * `purchase_order.submit`). Quotation prefill needs `quotation.view`.
 *
 * Query: `?purchaseRequestId=&selectedQuotationId=`
 */
export function PurchaseOrderCreatePage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const caps = resolvePurchaseOrderCapabilities(hasPermission);

  const purchaseRequestId = searchParams.get('purchaseRequestId');
  const selectedQuotationId = searchParams.get('selectedQuotationId');

  const create = useCreatePurchaseOrder();
  const update = useUpdatePurchaseOrder();
  const submit = useSubmitPurchaseOrder();
  const [draftId, setDraftId] = useState<string | null>(null);

  const quotationQuery = useVendorQuotationDetail(
    selectedQuotationId ?? undefined,
    Boolean(access) && caps.canCreate && caps.canViewQuotations,
  );

  const { control, handleSubmit, reset, setError } =
    useForm<PurchaseOrderFormValues>({
      resolver: zodResolver(purchaseOrderFormSchema),
      defaultValues: defaultPurchaseOrderFormValues({
        projectId: selectedProjectId ?? '',
        purchaseRequestId: purchaseRequestId ?? '',
        selectedQuotationId: selectedQuotationId ?? '',
      }),
      mode: 'onBlur',
    });

  useEffect(() => {
    if (!quotationQuery.data) return;
    reset(
      formValuesFromQuotation(quotationQuery.data, {
        projectId:
          quotationQuery.data.projectId || selectedProjectId || '',
        purchaseRequestId:
          purchaseRequestId || quotationQuery.data.purchaseRequestId,
      }),
    );
    setDraftId(null);
  }, [quotationQuery.data, purchaseRequestId, selectedProjectId, reset]);

  const sourceLines = useMemo(
    () =>
      quotationQuery.data
        ? quotationToSourceLines(quotationQuery.data)
        : [],
    [quotationQuery.data],
  );

  const sourcingLabel = useMemo(() => {
    if (!quotationQuery.data) return null;
    return `quotation ${quotationQuery.data.quotationNumber} (PR ${quotationQuery.data.purchaseRequestId})`;
  }, [quotationQuery.data]);

  if (access && !caps.canCreate) {
    return (
      <PermissionDenied
        title="Cannot create purchase order"
        message="You need purchase.order to create or submit purchase orders. (There are no purchase_order.create / purchase_order.submit codes in the Nest catalog.)"
      />
    );
  }

  if (access && caps.canCreate && !caps.canViewQuotations) {
    return (
      <PermissionDenied
        title="Quotation unavailable"
        message="Prefilling a PO from approved sourcing requires quotation.view in addition to purchase.order."
        showHomeLink={false}
      />
    );
  }

  if (!selectedQuotationId) {
    return (
      <EmptyState
        title="Select an approved quotation"
        description="Open New purchase order from sourcing (quotations) with a selectedQuotationId query param so lines and vendor can be loaded."
        actionLabel="Back to purchase orders"
        onAction={() => navigate(PURCHASE_ORDER_ROUTES.list)}
      />
    );
  }

  if (quotationQuery.error) {
    if (isForbiddenError(quotationQuery.error)) {
      return (
        <PermissionDenied
          title="Quotation denied"
          message="The server denied access to the vendor quotation (403)."
        />
      );
    }
    return (
      <RetryPanel
        error={quotationQuery.error}
        onRetry={() => void quotationQuery.refetch()}
        forceRetry
      />
    );
  }

  if (quotationQuery.isLoading || !quotationQuery.data) {
    return (
      <Typography color="text.secondary">Loading quotation…</Typography>
    );
  }

  const quotation = quotationQuery.data;
  const usable =
    quotation.status === VendorQuotationStatus.Submitted ||
    quotation.status === VendorQuotationStatus.Final;

  if (!usable) {
    return (
      <EmptyState
        title="Quotation not usable"
        description={`Selected quotation is ${quotation.status}. Nest accepts only submitted or final quotations for PO create.`}
        actionLabel="Back to purchase orders"
        onAction={() => navigate(PURCHASE_ORDER_ROUTES.list)}
      />
    );
  }

  if (
    purchaseRequestId &&
    purchaseRequestId !== quotation.purchaseRequestId
  ) {
    return (
      <EmptyState
        title="Sourcing mismatch"
        description="purchaseRequestId does not match the selected quotation’s purchase request."
        actionLabel="Back to purchase orders"
        onAction={() => navigate(PURCHASE_ORDER_ROUTES.list)}
      />
    );
  }

  const busy =
    create.isPending || update.isPending || submit.isPending;

  const persist = async (
    values: PurchaseOrderFormValues,
    thenSubmit: boolean,
  ) => {
    const sourceCheck = assertItemsMatchApprovedSource(
      values.items,
      sourceLines,
    );
    if (!sourceCheck.ok) {
      notifyError(sourceCheck.message);
      return;
    }

    try {
      let poId = draftId;
      let poNumber: string | undefined;

      if (poId) {
        const updated = await update.mutateAsync({
          id: poId,
          input: shapeUpdatePayload(values),
        });
        poNumber = updated.purchaseOrderNumber;
      } else {
        const created = await create.mutateAsync(shapeCreatePayload(values));
        poId = created.id;
        poNumber = created.purchaseOrderNumber;
        setDraftId(created.id);
      }

      if (thenSubmit && poId) {
        await submit.mutateAsync(poId);
        success(
          `Purchase order ${poNumber ?? poId} submitted for approval`,
        );
      } else {
        success(`Draft ${poNumber ?? poId} saved`);
      }
      navigate(PURCHASE_ORDER_ROUTES.list);
    } catch (err) {
      applyApiFieldErrors(setError, err);
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Stack spacing={2} data-testid="purchase-order-create-page">
      <Typography color="text.secondary">
        Create a draft purchase order from approved sourcing, then submit for
        approval (`purchase.order`).
      </Typography>
      <POForm
        control={control}
        handleSubmit={handleSubmit}
        sourceLines={sourceLines}
        sourcingLabel={sourcingLabel}
        busy={busy}
        onCancel={() => navigate(PURCHASE_ORDER_ROUTES.list)}
        onSaveDraft={(values) => persist(values, false)}
        onSaveAndSubmit={(values) => persist(values, true)}
      />
    </Stack>
  );
}
