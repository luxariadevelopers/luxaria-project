import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Drawer,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { executeDocumentUpload } from '@luxaria/shared-types';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/errors';
import { formDrawerPaperSx } from '@/components/forms';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { CashAccountStatus } from '@/cash-accounts/types';
import { useCashAccountsList } from '@/cash-accounts/useCashAccounts';
import { createWebUploadAdapters } from '@/documents';
import {
  ExpenseCategoryStatus,
  fetchExpenseCategories,
} from '@/expense-categories';
import {
  createSiteExpenseVoucher,
  submitSiteExpenseVoucher,
  updateSiteExpenseVoucher,
} from './api';
import { paymentModeLabel } from './labels';
import { expensesKeys } from './queryKeys';
import { assertSignatureReady } from './signatureRequired';
import { SiteExpenseAttachmentType, SiteExpensePaymentMode } from './types';
import {
  siteExpenseCreateSchema,
  type SiteExpenseCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
};

const MODE_OPTIONS = Object.values(SiteExpensePaymentMode).map((value) => ({
  value,
  label: paymentModeLabel(value),
}));

export function CreateExpenseDrawer({
  open,
  onClose,
  projectId,
  projectName,
}: Props) {
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotify();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const cashQuery = useCashAccountsList(
    {
      page: 1,
      limit: 100,
      projectId,
      status: CashAccountStatus.Active,
    },
    open && Boolean(projectId),
  );

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories', 'active-options', open],
    queryFn: () =>
      fetchExpenseCategories({
        page: 1,
        limit: 200,
        status: ExpenseCategoryStatus.Active,
      }),
    enabled: open,
    staleTime: 30_000,
    retry: false,
  });

  const { control, handleSubmit, reset, setValue } =
    useForm<SiteExpenseCreateFormValues>({
      resolver: zodResolver(siteExpenseCreateSchema),
      defaultValues: {
        expenseDate: new Date().toISOString().slice(0, 10),
        pettyCashAccountId: '',
        expenseCategoryId: '',
        amount: 0.01,
        paidTo: '',
        purpose: '',
        paymentMode: SiteExpensePaymentMode.Cash,
        billNumber: '',
        mobileNumber: '',
        submitImmediately: true,
      },
    });

  const expenseCategoryId = useWatch({ control, name: 'expenseCategoryId' });

  const cashOptions = useMemo(
    () =>
      (cashQuery.data?.items ?? []).map((row) => ({
        value: row.id,
        label: `${row.accountCode} — ${row.accountName}`,
      })),
    [cashQuery.data?.items],
  );

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((row) => ({
        value: row.id,
        label: `${row.categoryCode} — ${row.name}`,
      })),
    [categoriesQuery.data],
  );

  const selectedCategory = useMemo(
    () =>
      (categoriesQuery.data ?? []).find((row) => row.id === expenseCategoryId) ??
      null,
    [categoriesQuery.data, expenseCategoryId],
  );
  const requiresSignature = Boolean(selectedCategory?.requiresSignature);

  useEffect(() => {
    if (!open) {
      reset();
      setSignatureFile(null);
      return;
    }
    const firstCash = cashOptions[0]?.value;
    const firstCategory = categoryOptions[0]?.value;
    if (firstCash) setValue('pettyCashAccountId', firstCash);
    if (firstCategory) setValue('expenseCategoryId', firstCategory);
  }, [open, cashOptions, categoryOptions, reset, setValue]);

  const onSubmit = async (values: SiteExpenseCreateFormValues) => {
    const sigCheck = assertSignatureReady({
      requiresSignature,
      hasSignature: Boolean(signatureFile),
    });
    if (!sigCheck.ok) {
      notifyError(sigCheck.error);
      return;
    }

    setSaving(true);
    try {
      // Create draft first so document entityId is a real voucher id.
      let created = await createSiteExpenseVoucher({
        projectId,
        pettyCashAccountId: values.pettyCashAccountId,
        expenseDate: values.expenseDate,
        expenseCategoryId: values.expenseCategoryId,
        amount: values.amount,
        paidTo: values.paidTo.trim(),
        purpose: values.purpose.trim(),
        paymentMode: values.paymentMode,
        billNumber: values.billNumber?.trim() || null,
        mobileNumber: values.mobileNumber?.trim() || null,
      });

      if (signatureFile) {
        const uploaded = await executeDocumentUpload(
          createWebUploadAdapters(),
          {
            module: 'site_expense_vouchers',
            entityType: 'site_expense_voucher',
            entityId: created.id,
            documentType: 'signature',
            projectId,
          },
          {
            name: signatureFile.name,
            mimeType: signatureFile.type || 'image/jpeg',
            size: signatureFile.size,
            source: signatureFile,
          },
        );
        created = await updateSiteExpenseVoucher(created.id, {
          attachments: [
            {
              type: SiteExpenseAttachmentType.Signature,
              documentId: uploaded.id,
              fileName: uploaded.originalFileName || signatureFile.name,
              mimeType: uploaded.mimeType || signatureFile.type || null,
            },
          ],
        });
      }

      if (values.submitImmediately) {
        created = await submitSiteExpenseVoucher(created.id);
      }

      void queryClient.invalidateQueries({ queryKey: expensesKeys.all });
      success(
        values.submitImmediately
          ? `Expense ${created.voucherNumber} created and submitted`
          : `Expense ${created.voucherNumber} saved as draft`,
      );
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const lookupsLoading = cashQuery.isLoading || categoriesQuery.isLoading;
  const noCash = !lookupsLoading && cashOptions.length === 0;
  const noCategories = !lookupsLoading && categoryOptions.length === 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(460) },
      }}
    >
      <Box sx={{ p: 2.5 }} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Typography variant="h6">New site expense</Typography>
          <Typography variant="body2" color="text.secondary">
            Project-scoped voucher for{' '}
            {projectName ? <strong>{projectName}</strong> : 'the selected project'}
            . Paid from the project petty cash account. For material purchases that
            update stock, use Purchase Orders → Goods Receipt instead.
          </Typography>

          {noCash ? (
            <Alert severity="warning">
              No active petty cash account for this project. Create one under
              Accounting → Cash &amp; Petty Cash first.
            </Alert>
          ) : null}
          {noCategories ? (
            <Alert severity="warning">
              No active expense categories. Seed or create categories under Petty
              Cash → Expense Categories.
            </Alert>
          ) : null}
          {cashQuery.error ? (
            <Alert severity="error">
              {getErrorMessage(cashQuery.error, 'Could not load cash accounts')}
            </Alert>
          ) : null}
          {categoriesQuery.error ? (
            <Alert severity="error">
              {getErrorMessage(
                categoriesQuery.error,
                'Could not load expense categories',
              )}
            </Alert>
          ) : null}

          <FormTextField
            name="expenseDate"
            control={control}
            label="Expense date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormSelect
            name="pettyCashAccountId"
            control={control}
            label="Petty cash account"
            options={cashOptions}
            disabled={lookupsLoading || noCash}
          />
          <FormSelect
            name="expenseCategoryId"
            control={control}
            label="Expense category"
            options={categoryOptions}
            disabled={lookupsLoading || noCategories}
          />
          {requiresSignature ? (
            <Alert severity="info" variant="outlined">
              This category requires a beneficiary / engineer signature before
              submit.
            </Alert>
          ) : null}
          <FormTextField
            name="amount"
            control={control}
            label="Amount (INR)"
            type="number"
            slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
          />
          <FormSelect
            name="paymentMode"
            control={control}
            label="Payment mode"
            options={MODE_OPTIONS}
          />
          <FormTextField
            name="paidTo"
            control={control}
            label="Paid to"
          />
          <FormTextField
            name="purpose"
            control={control}
            label="Purpose"
            multiline
            minRows={2}
          />
          <FormTextField
            name="billNumber"
            control={control}
            label="Bill number (optional)"
          />
          <FormTextField
            name="mobileNumber"
            control={control}
            label="Mobile (optional)"
          />

          <Stack spacing={1}>
            <Typography variant="subtitle2">
              Beneficiary / engineer signature
              {requiresSignature ? ' *' : ''}
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSignatureFile(file);
                e.target.value = '';
              }}
            />
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="expense-create-signature-pick"
            >
              {signatureFile
                ? `Selected · ${signatureFile.name}`
                : 'Choose signature file'}
            </Button>
            {signatureFile ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => setSignatureFile(null)}
                disabled={saving}
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear signature
              </Button>
            ) : null}
          </Stack>

          <Controller
            name="submitImmediately"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                  />
                }
                label="Submit for review immediately"
              />
            )}
          />

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                !projectId ||
                noCash ||
                noCategories ||
                lookupsLoading
              }
            >
              {saving ? 'Saving…' : 'Save expense'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
