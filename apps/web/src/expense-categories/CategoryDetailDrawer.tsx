import { useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { CategoryStatusChip } from './CategoryStatusChip';
import { EvidenceRulesForm } from './EvidenceRulesForm';
import {
  buildCategoryBreadcrumbs,
  collectDescendantIds,
  countActiveChildren,
  findTreeNode,
  flattenCategoryTree,
} from './hierarchy';
import { formatApprovalLimit } from './labels';
import { LedgerAccountSelector } from './LedgerAccountSelector';
import type { ExpenseCategoryCapabilities } from './roleAccess';
import type {
  ExpenseCategoryTreeNode,
  PublicExpenseCategory,
} from './types';
import {
  useActivateExpenseCategory,
  useDeactivateExpenseCategory,
  useDeleteExpenseCategory,
  useUpdateExpenseCategory,
} from './useExpenseCategories';
import {
  categoryToUpdateFormValues,
  expenseCategoryUpdateSchema,
  toApprovalLimit,
  toParentCategoryId,
  type ExpenseCategoryUpdateFormValues,
} from './validation';

type Props = {
  open: boolean;
  category: PublicExpenseCategory | null;
  tree: readonly ExpenseCategoryTreeNode[];
  caps: ExpenseCategoryCapabilities;
  canViewAccounts: boolean;
  onClose: () => void;
  onAddChild: (parent: PublicExpenseCategory) => void;
  onSelectCategory: (categoryId: string) => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

export function CategoryDetailDrawer({
  open,
  category,
  tree,
  caps,
  canViewAccounts,
  onClose,
  onAddChild,
  onSelectCategory,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const update = useUpdateExpenseCategory();
  const activate = useActivateExpenseCategory();
  const deactivate = useDeactivateExpenseCategory();
  const remove = useDeleteExpenseCategory();

  const { control, handleSubmit, reset } =
    useForm<ExpenseCategoryUpdateFormValues>({
      resolver: zodResolver(expenseCategoryUpdateSchema),
      defaultValues: category
        ? categoryToUpdateFormValues(category)
        : {
            name: '',
            parentCategoryId: '',
            defaultLedgerAccountId: '',
            requiresBill: false,
            requiresSignature: false,
            requiresPhoto: false,
            approvalLimit: '',
          },
    });

  useEffect(() => {
    if (category) {
      reset(categoryToUpdateFormValues(category));
    }
  }, [category, reset]);

  const treeNode = category ? findTreeNode(tree, category.id) : null;
  const crumbs = category
    ? buildCategoryBreadcrumbs(tree, category.id)
    : [];
  const activeChildren = treeNode ? countActiveChildren(treeNode) : 0;

  const parentOptions = useMemo(() => {
    if (!category) return [];
    const blocked = collectDescendantIds(tree, category.id);
    const flat = flattenCategoryTree(tree).filter(
      (c) => c.id !== category.id && !blocked.has(c.id),
    );
    return [
      { value: '', label: 'Root (no parent)' },
      ...flat.map((c) => ({
        value: c.id,
        label: `${c.categoryCode} · ${c.name}`,
      })),
    ];
  }, [category, tree]);

  const busy =
    update.isPending ||
    activate.isPending ||
    deactivate.isPending ||
    remove.isPending;

  if (!category) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 } } } }}
      />
    );
  }

  const run = async (
    label: string,
    fn: () => Promise<unknown>,
  ): Promise<void> => {
    try {
      await fn();
      success(label);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onSave = async (values: ExpenseCategoryUpdateFormValues) => {
    try {
      await update.mutateAsync({
        id: category.id,
        input: {
          name: values.name.trim(),
          parentCategoryId: toParentCategoryId(values.parentCategoryId),
          defaultLedgerAccountId: values.defaultLedgerAccountId,
          requiresBill: values.requiresBill,
          requiresSignature: values.requiresSignature,
          requiresPhoto: values.requiresPhoto,
          approvalLimit: toApprovalLimit(values.approvalLimit),
        },
      });
      success('Expense category updated');
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
        paper: { sx: { width: { xs: '100%', sm: 480 } } },
      }}
    >
      <Box sx={{ p: 3 }} data-testid="expense-category-detail-drawer">
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">
              {category.categoryCode} · {category.name}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <CategoryStatusChip status={category.status} />
              {category.isSystem ? (
                <Typography variant="caption" color="warning.main">
                  System-seeded (cannot delete)
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Hierarchy
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              useFlexGap
              sx={{ flexWrap: 'wrap', mt: 0.5 }}
            >
              {crumbs.map((c, i) => (
                <Typography
                  key={c.id}
                  variant="body2"
                  component="button"
                  type="button"
                  onClick={() => onSelectCategory(c.id)}
                  sx={{
                    border: 0,
                    bgcolor: 'transparent',
                    p: 0,
                    cursor: 'pointer',
                    color: 'primary.main',
                    textDecoration: i < crumbs.length - 1 ? 'underline' : 'none',
                  }}
                >
                  {c.categoryCode}
                  {i < crumbs.length - 1 ? ' / ' : ''}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Divider />

          <Stack spacing={1.5}>
            <DetailRow label="Level" value={String(category.level)} />
            <DetailRow
              label="Current approval limit"
              value={formatApprovalLimit(category.approvalLimit)}
            />
            <DetailRow
              label="Mapped ledger"
              value={category.defaultLedgerAccountId ?? 'Not mapped'}
            />
          </Stack>

          {category.isSystem ? (
            <Alert severity="info">
              System categories cannot be deleted. Evidence rules and ledger
              mapping can still be updated when you have expense_category.manage.
            </Alert>
          ) : null}

          {activeChildren > 0 && category.status === 'active' ? (
            <Alert severity="warning">
              Deactivate blocked while {activeChildren} active child
              {activeChildren === 1 ? '' : 'ren'} exist.
            </Alert>
          ) : null}

          {caps.canManage ? (
            <Box
              component="form"
              onSubmit={(e) => {
                void handleSubmit(onSave)(e);
              }}
            >
              <Stack spacing={2}>
                <FormTextField
                  name="name"
                  control={control}
                  label="Name"
                  required
                  disabled={busy}
                />
                <FormSelect
                  name="parentCategoryId"
                  control={control}
                  label="Parent category"
                  options={parentOptions}
                  disabled={busy}
                />
                <LedgerAccountSelector
                  name="defaultLedgerAccountId"
                  control={control}
                  canViewAccounts={canViewAccounts}
                  disabled={busy}
                  required
                />
                <EvidenceRulesForm control={control} disabled={busy} />

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: 'wrap' }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={busy}
                  >
                    {update.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={busy}
                    onClick={() => onAddChild(category)}
                  >
                    Add child
                  </Button>
                  {category.status === 'active' ? (
                    <Button
                      variant="outlined"
                      color="warning"
                      disabled={busy || activeChildren > 0}
                      onClick={() => {
                        void run('Category deactivated', () =>
                          deactivate.mutateAsync(category.id),
                        );
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="success"
                      disabled={busy}
                      onClick={() => {
                        void run('Category activated', () =>
                          activate.mutateAsync(category.id),
                        );
                      }}
                    >
                      Activate
                    </Button>
                  )}
                  {!category.isSystem ? (
                    <Button
                      variant="outlined"
                      color="error"
                      disabled={busy}
                      onClick={() => {
                        void run('Category deleted', () =>
                          remove.mutateAsync(category.id).then(() => {
                            onClose();
                          }),
                        );
                      }}
                    >
                      Delete
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          ) : (
            <Alert severity="info">
              You can view evidence settings. expense_category.manage is required
              to change bill, photo, signature, or approval limits.
            </Alert>
          )}
        </Stack>
      </Box>
    </Drawer>
  );
}
