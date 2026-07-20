import { useEffect, useMemo } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { EvidenceRulesForm } from './EvidenceRulesForm';
import { flattenCategoryTree } from './hierarchy';
import { LedgerAccountSelector } from './LedgerAccountSelector';
import type { ExpenseCategoryTreeNode } from './types';
import { useCreateExpenseCategory } from './useExpenseCategories';
import {
  defaultCreateFormValues,
  expenseCategoryCreateSchema,
  toApprovalLimit,
  toParentCategoryId,
  type ExpenseCategoryCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  tree: readonly ExpenseCategoryTreeNode[];
  parentCategoryId?: string | null;
  canViewAccounts: boolean;
};

export function CreateCategoryDrawer({
  open,
  onClose,
  tree,
  parentCategoryId = null,
  canViewAccounts,
}: Props) {
  const create = useCreateExpenseCategory();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<ExpenseCategoryCreateFormValues>({
      resolver: zodResolver(expenseCategoryCreateSchema),
      defaultValues: defaultCreateFormValues({
        parentCategoryId: parentCategoryId ?? '',
      }),
    });

  useEffect(() => {
    if (!open) return;
    reset(
      defaultCreateFormValues({
        parentCategoryId: parentCategoryId ?? '',
      }),
    );
  }, [open, parentCategoryId, reset]);

  const parentOptions = useMemo(() => {
    const flat = flattenCategoryTree(tree).filter((c) => c.status === 'active');
    return [
      { value: '', label: 'Root (no parent)' },
      ...flat.map((c) => ({
        value: c.id,
        label: `${c.categoryCode} · ${c.name}`,
      })),
    ];
  }, [tree]);

  const onSubmit = async (values: ExpenseCategoryCreateFormValues) => {
    try {
      await create.mutateAsync({
        categoryCode: values.categoryCode.trim().toUpperCase(),
        name: values.name.trim(),
        parentCategoryId: toParentCategoryId(values.parentCategoryId),
        defaultLedgerAccountId: values.defaultLedgerAccountId,
        requiresBill: values.requiresBill,
        requiresSignature: values.requiresSignature,
        requiresPhoto: values.requiresPhoto,
        approvalLimit: toApprovalLimit(values.approvalLimit),
      });
      success('Expense category created');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 460 } } },
      }}
    >
      <Box
        component="form"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        sx={{ p: 3, height: '100%' }}
        data-testid="create-expense-category-drawer"
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Typography variant="h6">New expense category</Typography>
          <Typography variant="body2" color="text.secondary">
            Map a default expense ledger and set evidence requirements for
            site / petty-cash spend.
          </Typography>

          <FormTextField
            name="categoryCode"
            control={control}
            label="Category code"
            required
            helperText="Immutable after create (e.g. LABOUR)"
          />
          <FormTextField
            name="name"
            control={control}
            label="Name"
            required
          />
          <FormSelect
            name="parentCategoryId"
            control={control}
            label="Parent category"
            options={parentOptions}
          />
          <LedgerAccountSelector
            name="defaultLedgerAccountId"
            control={control}
            canViewAccounts={canViewAccounts}
            required
          />
          <EvidenceRulesForm control={control} disabled={create.isPending} />

          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
