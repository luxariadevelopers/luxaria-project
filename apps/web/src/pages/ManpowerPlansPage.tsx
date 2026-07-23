import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/layouts/PageHeader';
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  manpowerPlanDetailPath,
  manpowerShortfallPath,
  PlanFormDrawer,
  PlansTable,
  resolveManpowerPlanCapabilities,
  useManpowerPlansList,
} from '@/manpower-plans';

/**
 * Daily manpower plans — `/contractors/manpower-plans`.
 *
 * Nest: `GET/POST /manpower-planning/plans`, `GET/PATCH …/plans/:id`.
 * Permissions: `manpower_plan.view` / `manpower_plan.manage`.
 */
export function ManpowerPlansPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveManpowerPlanCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [contractorId, setContractorId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const contractors = useQuery({
    queryKey: ['manpower-plans', 'contractors', selectedProjectId],
    queryFn: () =>
      searchContractors({
        search: '',
        limit: 100,
        projectId: selectedProjectId ?? undefined,
      }),
    enabled: caps.canView && Boolean(selectedProjectId),
    staleTime: 60_000,
    retry: false,
  });

  const contractorOptions = useMemo(
    () =>
      (contractors.data ?? []).map((row) => ({
        id: row.id,
        label: `${row.contractorCode} · ${row.legalName}`,
      })),
    [contractors.data],
  );

  const contractorLabel = useMemo(() => {
    const map = new Map(contractorOptions.map((row) => [row.id, row.label]));
    return (id: string) => map.get(id) ?? id;
  }, [contractorOptions]);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      contractorId: contractorId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      sortBy: 'planDate',
      sortOrder: 'desc' as const,
    }),
    [page, pageSize, selectedProjectId, contractorId, fromDate, toDate],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useManpowerPlansList(listQuery, enabled);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Manpower plans unavailable"
        message="You need the manpower_plan.view permission to browse daily manpower plans."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Manpower plans denied"
        message="You do not have permission to load manpower plans."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to manage contractor daily manpower plans."
      />
    );
  }

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="manpower-plans-page">
      <PageHeader
        subtitle="Plan daily contractor headcount and skill mix. One plan per contractor per date; shortfall alerts compare against these plans."
        actions={
          <Button component={RouterLink} to={manpowerShortfallPath()} size="small">
            View shortfall alerts
          </Button>
        }
      />

      <PlansTable
        rows={rows}
        loading={list.isLoading || list.isFetching}
        error={
          list.error && !isForbiddenError(list.error) ? list.error : undefined
        }
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        caps={caps}
        contractorLabel={contractorLabel}
        filterSlot={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
          >
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="plans-contractor">Contractor</InputLabel>
              <Select
                labelId="plans-contractor"
                label="Contractor"
                value={contractorId}
                onChange={(e) => {
                  setContractorId(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All contractors</MenuItem>
                {contractorOptions.map((row) => (
                  <MenuItem key={row.id} value={row.id}>
                    {row.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="From"
              slotProps={{ inputLabel: { shrink: true } }}
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              slotProps={{ inputLabel: { shrink: true } }}
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </Stack>
        }
        toolbarActions={
          caps.canManage ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Create plan
            </Button>
          ) : undefined
        }
      />

      {caps.canManage ? (
        <PlanFormDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={selectedProjectId}
          contractors={contractorOptions}
          onCreated={(plan) => {
            navigate(manpowerPlanDetailPath(plan.id));
          }}
        />
      ) : null}

      {contractors.error ? (
        <Typography variant="caption" color="error">
          {getErrorMessage(contractors.error)}
        </Typography>
      ) : null}
    </Stack>
  );
}
