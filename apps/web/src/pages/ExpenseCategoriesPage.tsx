import { useMemo, useState } from 'react';
import {
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { CategoryDetailDrawer } from '@/expense-categories/CategoryDetailDrawer';
import { CategoryTree } from '@/expense-categories/CategoryTree';
import {
  filterCategoryTree,
  findTreeNode,
  flattenCategoryTree,
} from '@/expense-categories/hierarchy';
import { resolveExpenseCategoryCapabilities } from '@/expense-categories/roleAccess';
import {
  ExpenseCategoryStatus,
  type PublicExpenseCategory,
} from '@/expense-categories/types';
import {
  useExpenseCategoryTree,
  useSeedStandardExpenseCategories,
} from '@/expense-categories/useExpenseCategories';
import { CreateCategoryDrawer } from '@/expense-categories/CreateCategoryDrawer';

/**
 * Expense categories — `/accounting/expense-categories` (Micro Phase 051).
 *
 * Nest: `GET /expense-categories/tree` (+ create/update/evidence-rules/status).
 * Permissions: `expense_category.view` / `expense_category.manage`.
 */
export function ExpenseCategoriesPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveExpenseCategoryCapabilities(hasPermission);
  const canViewAccounts = hasPermission('account.view');
  const { success, error: notifyError } = useNotify();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const canView = Boolean(access) && caps.canView;
  const treeQuery = useExpenseCategoryTree(
    statusFilter || undefined,
    canView,
  );
  const seed = useSeedStandardExpenseCategories();

  const flat = useMemo(
    () => flattenCategoryTree(treeQuery.data ?? []),
    [treeQuery.data],
  );

  const filtered = useMemo(
    () =>
      filterCategoryTree(treeQuery.data ?? [], {
        search,
      }),
    [treeQuery.data, search],
  );

  const selectedCategory = useMemo(() => {
    if (!selectedId) return null;
    return flat.find((c) => c.id === selectedId) ?? null;
  }, [flat, selectedId]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Expense categories unavailable"
        message="You need the expense_category.view permission to browse expense categories."
      />
    );
  }

  if (treeQuery.error && isForbiddenError(treeQuery.error)) {
    return (
      <PermissionDenied
        error={treeQuery.error}
        title="Expense categories denied"
        message="You do not have permission to load expense categories."
      />
    );
  }

  const openCreate = (parent: PublicExpenseCategory | null = null) => {
    setCreateParentId(parent?.id ?? null);
    setCreateOpen(true);
  };

  const selectCategory = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <Stack spacing={2} data-testid="expense-categories-page">
      <Typography color="text.secondary">
        Configure hierarchical expense categories, default expense ledger
        mapping, and evidence rules (bill, photo, signature, approval limit).
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      >
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200, flex: '1 1 180px' }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="expense-cat-status-filter">Status</InputLabel>
          <Select
            labelId="expense-cat-status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value={ExpenseCategoryStatus.Active}>Active</MenuItem>
            <MenuItem value={ExpenseCategoryStatus.Inactive}>Inactive</MenuItem>
          </Select>
        </FormControl>
        {caps.canManage ? (
          <>
            <Button variant="contained" onClick={() => openCreate(null)}>
              New category
            </Button>
            <Button
              variant="outlined"
              disabled={seed.isPending}
              onClick={() => {
                void (async () => {
                  try {
                    const result = await seed.mutateAsync();
                    success(
                      `Seeded standard categories — created ${result.created}, skipped ${result.skipped}`,
                    );
                  } catch (err) {
                    notifyError(getErrorMessage(err));
                  }
                })();
              }}
            >
              {seed.isPending ? 'Seeding…' : 'Seed standard'}
            </Button>
          </>
        ) : null}
      </Stack>

      {treeQuery.isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Stack>
      ) : treeQuery.error ? (
        <RetryPanel
          error={treeQuery.error}
          onRetry={() => void treeQuery.refetch()}
          forceRetry
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No expense categories"
          description={
            (treeQuery.data?.length ?? 0) === 0
              ? caps.canManage
                ? 'Seed the standard set or create the first category.'
                : 'No expense categories are available yet.'
              : 'No categories match the current filters.'
          }
          actionLabel={
            caps.canManage && (treeQuery.data?.length ?? 0) === 0
              ? 'New category'
              : undefined
          }
          onAction={
            caps.canManage && (treeQuery.data?.length ?? 0) === 0
              ? () => openCreate(null)
              : undefined
          }
        />
      ) : (
        <CategoryTree
          nodes={filtered}
          selectedId={selectedId}
          onSelect={selectCategory}
        />
      )}

      <CategoryDetailDrawer
        open={detailOpen && Boolean(selectedCategory)}
        category={selectedCategory}
        tree={treeQuery.data ?? []}
        caps={caps}
        canViewAccounts={canViewAccounts}
        onClose={() => setDetailOpen(false)}
        onAddChild={(parent) => {
          openCreate(parent);
        }}
        onSelectCategory={(id) => {
          const node = findTreeNode(treeQuery.data ?? [], id);
          if (node) selectCategory(id);
        }}
      />

      {caps.canManage ? (
        <CreateCategoryDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          tree={treeQuery.data ?? []}
          parentCategoryId={createParentId}
          canViewAccounts={canViewAccounts}
        />
      ) : null}
    </Stack>
  );
}
