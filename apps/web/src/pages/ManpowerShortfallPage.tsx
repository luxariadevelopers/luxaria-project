import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '@/layouts/PageHeader';
import {
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { manpowerPlansListPath } from '@/manpower-plans/routes';
import { ScheduleImpactPanel } from '@/manpower-shortfall/ScheduleImpactPanel';
import { ShortfallTable } from '@/manpower-shortfall/ShortfallTable';
import { shortfallAlertTypeLabel } from '@/manpower-shortfall/labels';
import { resolveManpowerShortfallCapabilities } from '@/manpower-shortfall/roleAccess';
import { compareShortfallBySeverity } from '@/manpower-shortfall/shortfallSeverity';
import {
  ManpowerShortfallAlertType,
  type ManpowerShortfallAlertType as AlertType,
  type PublicManpowerShortfallAlert,
} from '@/manpower-shortfall/types';
import {
  useAcknowledgeShortfallAlert,
  useEvaluateShortfallAlerts,
  useShortfallAlertsList,
} from '@/manpower-shortfall/useManpowerShortfall';

/**
 * Manpower shortfall — `/contractors/manpower-shortfall` (Micro Phase 092).
 *
 * Nest: shortfall-alerts list/evaluate/acknowledge + compare.
 * Permissions: `manpower_shortfall.view` / `acknowledge` (+ `manpower_plan.view` for compare).
 */
export function ManpowerShortfallPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveManpowerShortfallCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [contractorId, setContractorId] = useState('');
  const [alertType, setAlertType] = useState('');
  const [unacknowledgedOnly, setUnacknowledgedOnly] = useState(true);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] =
    useState<PublicManpowerShortfallAlert | null>(null);

  const contractors = useQuery({
    queryKey: ['manpower-shortfall', 'contractors', selectedProjectId],
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

  const contractorLabel = useMemo(() => {
    const map = new Map(
      (contractors.data ?? []).map((row) => [
        row.id,
        `${row.contractorCode} · ${row.legalName}`,
      ]),
    );
    return (id: string) => map.get(id) ?? id;
  }, [contractors.data]);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      contractorId: contractorId || undefined,
      alertType: (alertType || undefined) as AlertType | undefined,
      unacknowledgedOnly: unacknowledgedOnly || undefined,
    }),
    [
      page,
      pageSize,
      selectedProjectId,
      contractorId,
      alertType,
      unacknowledgedOnly,
    ],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useShortfallAlertsList(listQuery, enabled);
  const evaluate = useEvaluateShortfallAlerts();
  const acknowledge = useAcknowledgeShortfallAlert();

  const rows = useMemo(() => {
    const items = [...(list.data?.items ?? [])];
    items.sort(compareShortfallBySeverity);
    return items;
  }, [list.data?.items]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Manpower shortfall unavailable"
        message="You need the manpower_shortfall.view permission. (Phase alias manpower_shortfall.escalate maps to manpower_shortfall.acknowledge for actions.)"
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Manpower shortfall denied"
        message="You do not have permission to load shortfall alerts."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to compare agreed, planned and actual labour."
      />
    );
  }

  const panelContractorId =
    selected?.contractorId || contractorId || null;
  const panelAsOf = selected
    ? selected.asOfDate.slice(0, 10)
    : asOf;

  return (
    <Stack spacing={2} data-testid="manpower-shortfall-page">
      <PageHeader
        subtitle="Compare agreed, planned and actual labour using Nest shortfall thresholds (80% / 60% fill-rate streaks). Acknowledge to escalate."
        actions={
          caps.canCompare ? (
            <Button
              component={RouterLink}
              to={manpowerPlansListPath()}
              size="small"
            >
              Manage daily plans
            </Button>
          ) : undefined
        }
      />

      <ShortfallTable
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
        onSelect={setSelected}
        onAcknowledge={
          caps.canEscalate
            ? (row) => {
                void (async () => {
                  try {
                    await acknowledge.mutateAsync(row.id);
                    success('Shortfall alert acknowledged');
                  } catch (err) {
                    notifyError(getErrorMessage(err));
                  }
                })();
              }
            : undefined
        }
        filterSlot={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
          >
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="shortfall-contractor">Contractor</InputLabel>
              <Select
                labelId="shortfall-contractor"
                label="Contractor"
                value={contractorId}
                onChange={(e) => {
                  setContractorId(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All contractors</MenuItem>
                {(contractors.data ?? []).map((row) => (
                  <MenuItem key={row.id} value={row.id}>
                    {row.contractorCode} · {row.legalName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="shortfall-type">Alert type</InputLabel>
              <Select
                labelId="shortfall-type"
                label="Alert type"
                value={alertType}
                onChange={(e) => {
                  setAlertType(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All types</MenuItem>
                {Object.values(ManpowerShortfallAlertType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {shortfallAlertTypeLabel(type)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={unacknowledgedOnly}
                  onChange={(e) => {
                    setUnacknowledgedOnly(e.target.checked);
                    setPage(1);
                  }}
                />
              }
              label="Unacknowledged only"
            />
            <TextField
              size="small"
              type="date"
              label="Evaluate as of"
              slotProps={{ inputLabel: { shrink: true } }}
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </Stack>
        }
        toolbarActions={
          caps.canEscalate ? (
            <Button
              variant="contained"
              disabled={evaluate.isPending}
              onClick={() => {
                void (async () => {
                  try {
                    const outcome = await evaluate.mutateAsync({
                      asOf,
                      projectId: selectedProjectId,
                      contractorId: contractorId || undefined,
                    });
                    success(
                      `Evaluation complete: ${outcome.created} new, ${outcome.updated} updated`,
                    );
                  } catch (err) {
                    notifyError(getErrorMessage(err));
                  }
                })();
              }}
            >
              {evaluate.isPending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                'Evaluate shortfalls'
              )}
            </Button>
          ) : undefined
        }
      />

      {caps.canCompare || selected ? (
        <ScheduleImpactPanel
          projectId={selectedProjectId}
          contractorId={panelContractorId}
          asOfDate={panelAsOf}
          enabled={caps.canCompare}
          expectedScheduleImpactDays={selected?.expectedScheduleImpactDays}
          shortfallPercent={selected?.shortfallPercent}
        />
      ) : null}

      {selected ? (
        <Typography variant="body2" color="text.secondary">
          Selected: {shortfallAlertTypeLabel(selected.alertType)} —{' '}
          {selected.message}
        </Typography>
      ) : null}
    </Stack>
  );
}
