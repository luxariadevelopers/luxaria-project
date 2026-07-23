import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { AccountDetailDrawer } from '@/chart-of-accounts/AccountDetailDrawer';
import { AccountTree } from '@/chart-of-accounts/AccountTree';
import { filterAccountTree } from '@/chart-of-accounts/filterTree';
import { findTreeNode, flattenAccountTree } from '@/chart-of-accounts/hierarchy';
import { ACCOUNT_TYPE_OPTIONS } from '@/chart-of-accounts/labels';
import { resolveChartOfAccountsCapabilities } from '@/chart-of-accounts/roleAccess';
import type { AccountType, PublicAccount } from '@/chart-of-accounts/types';
import { AccountStatus } from '@/chart-of-accounts/types';
import {
  useAccountTree,
  useSeedStandardAccounts,
} from '@/chart-of-accounts/useChartOfAccounts';
import { PageHeader } from '@/layouts/PageHeader';

/**
 * Chart of accounts tree — `/accounting/chart-of-accounts` (Micro Phase 041).
 * Create/edit open dedicated pages (Micro Phase 042).
 *
 * Nest: `GET /accounts/tree` (+ create/update/parent/status).
 * Permissions: `account.view` / `account.manage` (no create/update codes).
 */
export function ChartOfAccountsPage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const caps = resolveChartOfAccountsCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<AccountType | ''>('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const treeQuery = useAccountTree(statusFilter || undefined, canView);
  const seed = useSeedStandardAccounts();

  const flat = useMemo(
    () => flattenAccountTree(treeQuery.data ?? []),
    [treeQuery.data],
  );

  const filtered = useMemo(
    () =>
      filterAccountTree(treeQuery.data ?? [], {
        search,
        accountType: typeFilter,
      }),
    [treeQuery.data, search, typeFilter],
  );

  const selectedAccount = useMemo(() => {
    if (!selectedId) return null;
    return flat.find((a) => a.id === selectedId) ?? null;
  }, [flat, selectedId]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Chart of accounts unavailable"
        message="You need the account.view permission to browse the chart of accounts."
      />
    );
  }

  if (treeQuery.error && isForbiddenError(treeQuery.error)) {
    return (
      <PermissionDenied
        error={treeQuery.error}
        title="Chart of accounts denied"
        message="You do not have permission to load accounts."
      />
    );
  }

  const openCreate = (parent: PublicAccount | null = null) => {
    if (parent) {
      navigate(
        `/accounting/chart-of-accounts/new?parentId=${encodeURIComponent(parent.id)}`,
      );
      return;
    }
    navigate('/accounting/chart-of-accounts/new');
  };

  const openEdit = (account: PublicAccount) => {
    navigate(`/accounting/chart-of-accounts/${account.id}/edit`);
  };

  const selectAccount = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <Stack spacing={2} data-testid="chart-of-accounts-page">
      <PageHeader
        title="Chart of accounts"
        subtitle="Company chart of accounts — browse the hierarchy, maintain allowed accounts, and keep system-seeded accounts protected."
        actions={
          caps.canManage ? (
            <Button variant="contained" onClick={() => openCreate(null)}>
              New account
            </Button>
          ) : undefined
        }
      />

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
          <InputLabel id="coa-type-filter">Type</InputLabel>
          <Select
            labelId="coa-type-filter"
            label="Type"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as AccountType | '')
            }
          >
            <MenuItem value="">All types</MenuItem>
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="coa-status-filter">Status</InputLabel>
          <Select
            labelId="coa-status-filter"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value={AccountStatus.Active}>Active</MenuItem>
            <MenuItem value={AccountStatus.Inactive}>Inactive</MenuItem>
          </Select>
        </FormControl>
        {caps.canManage ? (
          <Button
            variant="outlined"
            disabled={seed.isPending}
            onClick={() => {
              void (async () => {
                try {
                  const result = await seed.mutateAsync();
                  success(
                    `Seeded standard accounts — created ${result.created}, skipped ${result.skipped}`,
                  );
                } catch (err) {
                  notifyError(getErrorMessage(err));
                }
              })();
            }}
          >
            {seed.isPending ? 'Seeding…' : 'Seed standard'}
          </Button>
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
          title="No accounts"
          description={
            (treeQuery.data?.length ?? 0) === 0
              ? caps.canManage
                ? 'Seed the standard chart or create the first account.'
                : 'No accounts are available yet.'
              : 'No accounts match the current filters.'
          }
          actionLabel={
            caps.canManage && (treeQuery.data?.length ?? 0) === 0
              ? 'New account'
              : undefined
          }
          onAction={
            caps.canManage && (treeQuery.data?.length ?? 0) === 0
              ? () => openCreate(null)
              : undefined
          }
        />
      ) : (
        <AccountTree
          nodes={filtered}
          selectedId={selectedId}
          onSelect={selectAccount}
        />
      )}

      <AccountDetailDrawer
        open={detailOpen && Boolean(selectedAccount)}
        account={selectedAccount}
        tree={treeQuery.data ?? []}
        caps={caps}
        onClose={() => setDetailOpen(false)}
        onEdit={(account) => {
          openEdit(account);
        }}
        onAddChild={(parent) => {
          openCreate(parent);
        }}
        onSelectAccount={(id) => {
          const node = findTreeNode(treeQuery.data ?? [], id);
          if (node) selectAccount(id);
        }}
      />
    </Stack>
  );
}
