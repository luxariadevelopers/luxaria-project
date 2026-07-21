import { useMemo, useState } from 'react';
import type { SortOrder } from '@luxaria/shared-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { isForbiddenError, toAppError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/data-table';
import {
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { formatDate, formatDateTime } from '@/format';
import {
  FINANCIAL_YEAR_LIST_PAGE_SIZE,
  FINANCIAL_YEAR_LIST_PAGE_SIZE_OPTIONS,
  FINANCIAL_YEAR_ROUTE_BASE,
} from './constants';
import { resolveFinancialYearCapabilities } from './permissions';
import {
  FinancialYearStatus,
  type PublicFinancialYear,
} from './types';
import { TransactionDateValidator } from './TransactionDateValidator';
import {
  useCurrentFinancialYear,
  useFinancialYearCompany,
  useFinancialYearsList,
} from './useFinancialYears';

type BooleanFilter = '' | 'true' | 'false';

function toOptionalBoolean(value: BooleanFilter): boolean | undefined {
  if (value === '') return undefined;
  return value === 'true';
}

function displayCompany(
  company:
    | { tradeName: string; legalName: string; companyCode: string }
    | undefined,
) {
  return (
    company?.tradeName?.trim() ||
    company?.legalName?.trim() ||
    company?.companyCode ||
    'Authenticated company'
  );
}

function statusColor(status: FinancialYearStatus) {
  if (status === FinancialYearStatus.Open) return 'success' as const;
  if (status === FinancialYearStatus.Locked) return 'warning' as const;
  return 'default' as const;
}

export function FinancialYearListPage() {
  const navigate = useNavigate();
  const { user, access, hasPermission } = useAuth();
  const capabilities = resolveFinancialYearCapabilities(hasPermission);
  const canView = Boolean(access) && capabilities.canView;
  const canReadCompany = hasPermission('company.view');

  const companyQuery = useFinancialYearCompany(
    user?.companyId,
    canView && canReadCompany,
  );
  const companyId = user?.companyId ?? companyQuery.data?.id ?? null;
  const companyName = displayCompany(companyQuery.data);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    FINANCIAL_YEAR_LIST_PAGE_SIZE,
  );
  const [status, setStatus] = useState<FinancialYearStatus | ''>('');
  const [currentFilter, setCurrentFilter] =
    useState<BooleanFilter>('');
  const [lockedFilter, setLockedFilter] = useState<BooleanFilter>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [search, setSearch] = useState('');

  const listRequest = useMemo(
    () => ({
      page,
      limit: pageSize,
      companyId: companyId ?? undefined,
      status: status || undefined,
      isCurrent: toOptionalBoolean(currentFilter),
      isLocked: toOptionalBoolean(lockedFilter),
      sortOrder,
    }),
    [
      page,
      pageSize,
      companyId,
      status,
      currentFilter,
      lockedFilter,
      sortOrder,
    ],
  );

  const listQuery = useFinancialYearsList(
    listRequest,
    canView,
  );
  const currentQuery = useCurrentFinancialYear(
    companyId,
    canView,
  );

  const rows = useMemo(() => {
    const loaded = listQuery.data?.items ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return loaded;
    return loaded.filter((row) => {
      const values = [
        row.name,
        row.status,
        row.startDate.slice(0, 10),
        row.endDate.slice(0, 10),
        row.isCurrent ? 'current' : '',
        row.isLocked ? 'locked' : '',
        companyName,
      ];
      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [companyName, listQuery.data?.items, search]);

  const columns = useMemo<GridColDef<PublicFinancialYear>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Financial year',
        minWidth: 190,
        flex: 1,
      },
      {
        field: 'startDate',
        headerName: 'Start date',
        width: 130,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: 'endDate',
        headerName: 'End date',
        width: 130,
        sortable: false,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            variant="outlined"
            color={statusColor(row.status)}
            label={
              row.status.charAt(0).toUpperCase() + row.status.slice(1)
            }
          />
        ),
      },
      {
        field: 'isCurrent',
        headerName: 'Current',
        width: 105,
        sortable: false,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            color={row.isCurrent ? 'primary' : 'default'}
            variant={row.isCurrent ? 'filled' : 'outlined'}
            label={row.isCurrent ? 'Current' : 'No'}
          />
        ),
      },
      {
        field: 'isLocked',
        headerName: 'Locked',
        width: 105,
        sortable: false,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            color={row.isLocked ? 'warning' : 'success'}
            variant="outlined"
            label={row.isLocked ? 'Locked' : 'Unlocked'}
          />
        ),
      },
      {
        field: 'companyId',
        headerName: 'Company',
        minWidth: 180,
        sortable: false,
        valueFormatter: (value: string | null) =>
          value === companyId || value == null
            ? companyName
            : value,
      },
      {
        field: 'lockedAt',
        headerName: 'Locked at',
        width: 170,
        sortable: false,
        valueFormatter: (value: string | null) =>
          value ? formatDateTime(value) : '—',
      },
    ],
    [companyId, companyName],
  );

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!capabilities.canView) {
    return (
      <PermissionDenied
        title="Financial years unavailable"
        message="You need the financial_year.view permission to open financial years."
      />
    );
  }

  if (listQuery.error && isForbiddenError(listQuery.error)) {
    return (
      <PermissionDenied
        error={listQuery.error}
        title="Financial year list denied"
        message="The server denied access to the financial year register."
      />
    );
  }

  const currentNotSet =
    currentQuery.error &&
    toAppError(currentQuery.error).kind === 'not_found';

  const filterSlot = (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="financial-year-status-filter">Status</InputLabel>
        <Select
          labelId="financial-year-status-filter"
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as FinancialYearStatus | '');
            setPage(1);
          }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value={FinancialYearStatus.Open}>Open</MenuItem>
          <MenuItem value={FinancialYearStatus.Closed}>Closed</MenuItem>
          <MenuItem value={FinancialYearStatus.Locked}>Locked</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 135 }}>
        <InputLabel id="financial-year-current-filter">Current</InputLabel>
        <Select
          labelId="financial-year-current-filter"
          label="Current"
          value={currentFilter}
          onChange={(event) => {
            setCurrentFilter(event.target.value as BooleanFilter);
            setPage(1);
          }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="true">Current only</MenuItem>
          <MenuItem value="false">Not current</MenuItem>
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 135 }}>
        <InputLabel id="financial-year-locked-filter">Lock state</InputLabel>
        <Select
          labelId="financial-year-locked-filter"
          label="Lock state"
          value={lockedFilter}
          onChange={(event) => {
            setLockedFilter(event.target.value as BooleanFilter);
            setPage(1);
          }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="true">Locked only</MenuItem>
          <MenuItem value="false">Unlocked only</MenuItem>
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Company"
        value={companyName}
        slotProps={{ input: { readOnly: true } }}
        sx={{ minWidth: 190 }}
      />
    </Stack>
  );

  return (
    <Stack spacing={2} data-testid="financial-years-list-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Financial years</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage the company&apos;s current year, posting lock, and approved
            unlock lifecycle.
          </Typography>
        </Stack>
        {capabilities.canManage ? (
          <Button
            component={RouterLink}
            to={`${FINANCIAL_YEAR_ROUTE_BASE}/new`}
            variant="contained"
          >
            New financial year
          </Button>
        ) : null}
      </Stack>

      {companyQuery.error && user?.companyId ? (
        <Alert severity="info" variant="outlined">
          The optional company label lookup is unavailable. Records remain
          scoped to your authenticated company id.
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6">Current financial year</Typography>
          {currentQuery.isLoading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={20} />
              <Typography color="text.secondary">Loading current year…</Typography>
            </Stack>
          ) : currentQuery.data ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 600 }}>
                  {currentQuery.data.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(currentQuery.data.startDate)} –{' '}
                  {formatDate(currentQuery.data.endDate)}
                  {currentQuery.data.isLocked ? ' · Locked' : ' · Open'}
                </Typography>
              </Stack>
              <Button
                component={RouterLink}
                to={`${FINANCIAL_YEAR_ROUTE_BASE}/${currentQuery.data.id}`}
              >
                View lifecycle
              </Button>
            </Stack>
          ) : currentNotSet ? (
            <Alert severity="warning" variant="outlined">
              No current financial year is set for this company.
            </Alert>
          ) : currentQuery.error ? (
            <RetryPanel
              error={currentQuery.error}
              onRetry={() => void currentQuery.refetch()}
              forceRetry
            />
          ) : null}
        </Stack>
      </Paper>

      <Alert severity="info" variant="outlined">
        The API supports company, status, current, locked, pagination, and
        start-date sort direction. Text search below filters only the loaded
        page because the backend has no financial-year search or date-range
        filter.
      </Alert>

      <DataTable<PublicFinancialYear>
        title="Financial year register"
        rows={rows}
        columns={columns}
        loading={listQuery.isLoading || listQuery.isFetching}
        error={listQuery.error}
        onRetry={() => void listQuery.refetch()}
        emptyTitle={search ? 'No matches on this page' : 'No financial years'}
        emptyDescription={
          search
            ? 'Clear the page search or move to another page.'
            : capabilities.canManage
              ? 'Create the first financial year for this company.'
              : 'No financial years are available for this company.'
        }
        paginationMode="server"
        sortingMode="server"
        page={page}
        pageSize={pageSize}
        pageSizeOptions={FINANCIAL_YEAR_LIST_PAGE_SIZE_OPTIONS}
        rowCount={listQuery.data?.meta.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
        sortBy="startDate"
        sortOrder={sortOrder}
        allowedSortKeys={['startDate']}
        onSortChange={(_sortBy, nextOrder) => {
          setSortOrder(nextOrder);
          setPage(1);
        }}
        search={search}
        searchPlaceholder="Filter this loaded page"
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filterSlot={filterSlot}
        preferencesKey="financial-year-register"
        allowedFilterKeys={['status', 'isCurrent', 'isLocked']}
        filterValues={{
          status,
          isCurrent: currentFilter,
          isLocked: lockedFilter,
        }}
        getRowId={(row) => row.id}
        onRowClick={({ row }) =>
          void navigate(`${FINANCIAL_YEAR_ROUTE_BASE}/${row.id}`)
        }
        rowActions={(row) => [
          {
            id: 'view',
            label: 'View lifecycle',
            permission: 'financial_year.view',
            onClick: () =>
              void navigate(`${FINANCIAL_YEAR_ROUTE_BASE}/${row.id}`),
          },
        ]}
        height={520}
        showColumnVisibility
      />

      <TransactionDateValidator companyId={companyId} />
    </Stack>
  );
}
