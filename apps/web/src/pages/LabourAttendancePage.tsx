import { useMemo, useState } from 'react';
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
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { AttendanceDetailDrawer } from '@/labour-attendance/AttendanceDetailDrawer';
import { AttendanceTable } from '@/labour-attendance/AttendanceTable';
import { CreateAttendanceDrawer } from '@/labour-attendance/CreateAttendanceDrawer';
import { attendanceStatusLabel } from '@/labour-attendance/labels';
import { resolveLabourAttendanceCapabilities } from '@/labour-attendance/roleAccess';
import {
  LabourAttendanceStatus,
  type LabourAttendanceStatus as Status,
  type PublicLabourAttendance,
} from '@/labour-attendance/types';
import {
  useConfirmLabourAttendance,
  useLabourAttendanceList,
} from '@/labour-attendance/useLabourAttendance';

/**
 * Labour attendance list — `/contractors/attendance` (Micro Phase 091 / 124).
 *
 * Nest: `GET/POST /labour-attendance`, `GET /labour-attendance/:id`.
 * Permissions: `attendance.view` / `attendance.create` / `attendance.confirm`.
 */
export function LabourAttendancePage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveLabourAttendanceCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const confirm = useConfirmLabourAttendance();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [contractorId, setContractorId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const contractors = useQuery({
    queryKey: ['labour-attendance', 'contractors', selectedProjectId],
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
      attendanceDate: attendanceDate || undefined,
      status: (statusFilter || undefined) as Status | undefined,
    }),
    [
      page,
      pageSize,
      selectedProjectId,
      contractorId,
      attendanceDate,
      statusFilter,
    ],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useLabourAttendanceList(listQuery, enabled);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Labour attendance unavailable"
        message="You need the attendance.view permission to review labour attendance. (Phase alias labour_attendance.view is not in the Nest catalog.)"
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Labour attendance denied"
        message="You do not have permission to load labour attendance."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to review daily contractor manpower."
      />
    );
  }

  const openSheet = (row: PublicLabourAttendance) => {
    setSelectedId(row.id);
    setDetailOpen(true);
  };

  return (
    <Stack spacing={2} data-testid="labour-attendance-page">
      <Typography color="text.secondary">
        Create or review daily contractor manpower sheets, skill breakdown,
        GPS/photo evidence, and duplicate flags.
      </Typography>

      <AttendanceTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error && !isForbiddenError(list.error) ? list.error : undefined}
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
        onOpen={openSheet}
        onConfirm={
          caps.canConfirm
            ? (row) => {
                void (async () => {
                  try {
                    await confirm.mutateAsync({ id: row.id });
                    success('Attendance confirmed');
                  } catch (err) {
                    notifyError(getErrorMessage(err));
                  }
                })();
              }
            : undefined
        }
        toolbarActions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New attendance
            </Button>
          ) : undefined
        }
        filterSlot={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            <TextField
              size="small"
              type="date"
              label="Attendance date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={attendanceDate}
              onChange={(e) => {
                setAttendanceDate(e.target.value);
                setPage(1);
              }}
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="attendance-contractor">Contractor</InputLabel>
              <Select
                labelId="attendance-contractor"
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
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="attendance-status">Status</InputLabel>
              <Select
                labelId="attendance-status"
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">All statuses</MenuItem>
                {Object.values(LabourAttendanceStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {attendanceStatusLabel(status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        }
      />

      <AttendanceDetailDrawer
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedId(null);
        }}
        attendanceId={selectedId}
        caps={caps}
        contractorLabel={contractorLabel}
      />

      {caps.canCreate && selectedProjectId ? (
        <CreateAttendanceDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={selectedProjectId}
          defaultAttendanceDate={attendanceDate}
          onCreated={(id) => {
            setSelectedId(id);
            setDetailOpen(true);
          }}
        />
      ) : null}
    </Stack>
  );
}
