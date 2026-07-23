import { useMemo, useState } from 'react';
import { PageHeader } from '@/layouts/PageHeader';
import {
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { CategoryDetailDrawer } from '@/labour-categories/CategoryDetailDrawer';
import { CategoryFormDrawer } from '@/labour-categories/CategoryFormDrawer';
import { LabourCategoryTable } from '@/labour-categories/LabourCategoryTable';
import { labourSkillLevelLabel } from '@/labour-categories/labels';
import { resolveLabourCategoryCapabilities } from '@/labour-categories/roleAccess';
import {
  LabourCategoryStatus,
  LabourSkillLevel,
  type LabourCategoryStatus as Status,
  type LabourSkillLevel as Skill,
  type PublicLabourCategory,
} from '@/labour-categories/types';
import {
  useActivateLabourCategory,
  useDeactivateLabourCategory,
  useLabourCategoriesList,
  useSeedStandardLabourCategories,
} from '@/labour-categories/useLabourCategories';

/**
 * Labour categories — `/contractors/labour-categories` (Micro Phase 090).
 *
 * Nest: `GET/POST /labour-categories`, rates, activate/deactivate, seed.
 * Permissions: `labour_category.view` / `labour_category.manage`.
 */
export function LabourCategoriesPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveLabourCategoryCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [selected, setSelected] = useState<PublicLabourCategory | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: (statusFilter || undefined) as Status | undefined,
      skillLevel: (skillFilter || undefined) as Skill | undefined,
    }),
    [page, pageSize, search, statusFilter, skillFilter],
  );

  const canView = Boolean(access) && caps.canView;
  const list = useLabourCategoriesList(listQuery, canView);
  const seed = useSeedStandardLabourCategories();
  const activate = useActivateLabourCategory();
  const deactivate = useDeactivateLabourCategory();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Labour categories unavailable"
        message="You need the labour_category.view permission to browse labour categories."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Labour categories denied"
        message="You do not have permission to load labour categories."
      />
    );
  }

  const openCategory = (row: PublicLabourCategory) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const runStatus = (
    row: PublicLabourCategory,
    action: 'activate' | 'deactivate',
  ) => {
    void (async () => {
      try {
        if (action === 'activate') {
          await activate.mutateAsync(row.id);
          success('Labour category activated');
        } else {
          await deactivate.mutateAsync(row.id);
          success('Labour category deactivated');
        }
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Stack spacing={2} data-testid="labour-categories-page">
      <PageHeader
        subtitle="Manage labour skills and company rates. Project and contractor overrides apply across attendance and vouchers."
      />

      {list.error && !isForbiddenError(list.error) ? (
        <RetryPanel
          error={list.error}
          title="Could not load labour categories"
          message={getErrorMessage(list.error)}
          onRetry={() => void list.refetch()}
        />
      ) : null}

      <LabourCategoryTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={undefined}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        caps={caps}
        onOpen={openCategory}
        onActivate={
          caps.canManage ? (row) => runStatus(row, 'activate') : undefined
        }
        onDeactivate={
          caps.canManage ? (row) => runStatus(row, 'deactivate') : undefined
        }
        filterSlot={
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="labour-cat-status">Status</InputLabel>
              <Select
                labelId="labour-cat-status"
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value={LabourCategoryStatus.Active}>Active</MenuItem>
                <MenuItem value={LabourCategoryStatus.Inactive}>
                  Inactive
                </MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="labour-cat-skill">Skill</InputLabel>
              <Select
                labelId="labour-cat-skill"
                label="Skill"
                value={skillFilter}
                onChange={(e) => {
                  setSkillFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All skills</MenuItem>
                {Object.values(LabourSkillLevel).map((level) => (
                  <MenuItem key={level} value={level}>
                    {labourSkillLevelLabel(level)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        }
        toolbarActions={
          caps.canManage ? (
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => setCreateOpen(true)}>
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
                        `Seeded ${result.created} categories (${result.skipped} skipped)`,
                      );
                    } catch (err) {
                      notifyError(getErrorMessage(err));
                    }
                  })();
                }}
              >
                {seed.isPending ? (
                  <CircularProgress size={18} />
                ) : (
                  'Seed standard'
                )}
              </Button>
            </Stack>
          ) : undefined
        }
      />

      {!list.isLoading &&
      !list.error &&
      (list.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No labour categories yet"
          description="Use Seed standard to create Mason, Helper, Carpenter and other trades, or create a custom category."
        />
      ) : null}

      <CategoryFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <CategoryDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
        }}
        category={selected}
        caps={caps}
      />
    </Stack>
  );
}
