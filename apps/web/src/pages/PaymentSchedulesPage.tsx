import { useMemo, useState } from 'react';
import {
  Button,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { GeneratePaymentScheduleForm } from '@/payment-schedules/GeneratePaymentScheduleForm';
import { OverdueLinesTable } from '@/payment-schedules/OverdueLinesTable';
import {
  PaymentScheduleFilters,
  type PaymentScheduleFilterState,
} from '@/payment-schedules/PaymentScheduleFilters';
import { PaymentScheduleTable } from '@/payment-schedules/PaymentScheduleTable';
import { paymentScheduleDetailPath } from '@/payment-schedules/paths';
import { resolvePaymentScheduleCapabilities } from '@/payment-schedules/roleAccess';
import type {
  PaymentScheduleStatusValue,
  PaymentScheduleTypeValue,
} from '@/payment-schedules/types';
import { usePaymentScheduleLookups } from '@/payment-schedules/usePaymentScheduleLookups';
import {
  useBookingOptionsForSchedule,
  useOverdueScheduleLines,
  usePaymentSchedulesList,
  useRunMarkOverdueJob,
} from '@/payment-schedules/usePaymentSchedules';
import { canRunMarkOverdueJob } from '@/payment-schedules/workflowActions';
import { PageHeader } from '@/layouts/PageHeader';

type TabValue = 'schedules' | 'overdue';

/**
 * Payment schedules list — `/sales/payment-schedules`.
 * Nest: GET /payment-schedules, GET /payment-schedules/overdue,
 * POST /payment-schedules/generate, POST /jobs/mark-overdue.
 */
export function PaymentSchedulesPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolvePaymentScheduleCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotify();

  const [tab, setTab] = useState<TabValue>('schedules');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PaymentScheduleFilterState>({
    status: '',
    scheduleType: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [markOverdueOpen, setMarkOverdueOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as
        | PaymentScheduleStatusValue
        | undefined,
      scheduleType: (filters.scheduleType || undefined) as
        | PaymentScheduleTypeValue
        | undefined,
      projectId: projectId ?? undefined,
    }),
    [page, pageSize, search, filters, projectId],
  );

  const schedulesQuery = usePaymentSchedulesList(
    listQuery,
    canView && Boolean(projectId) && tab === 'schedules',
  );
  const overdueQuery = useOverdueScheduleLines(
    { page, limit: pageSize },
    canView && Boolean(projectId) && tab === 'overdue',
  );
  const bookings = useBookingOptionsForSchedule(
    projectId,
    canView && caps.canCreate && caps.canViewBookings,
  );
  const markOverdue = useRunMarkOverdueJob();

  const scheduleRows = schedulesQuery.data?.items ?? [];
  const overdueRows = overdueQuery.data?.items ?? [];

  const bookingLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings.data ?? []) {
      map.set(b.id, b.label);
    }
    return map;
  }, [bookings.data]);

  const scheduleLabels = usePaymentScheduleLookups(scheduleRows, {
    projectId,
    canViewUnits: caps.canViewUnits,
    canViewCustomers: caps.canViewCustomers,
    bookingLabels: bookingLabelMap,
  });

  const overdueLabels = usePaymentScheduleLookups(overdueRows, {
    projectId,
    canViewUnits: caps.canViewUnits,
    canViewCustomers: caps.canViewCustomers,
    bookingLabels: bookingLabelMap,
  });

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Payment schedules unavailable"
        message="You need the collection.view permission to manage payment schedules."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to review payment schedules."
      />
    );
  }

  const listError =
    tab === 'schedules' ? schedulesQuery.error : overdueQuery.error;
  if (listError && isForbiddenError(listError)) {
    return (
      <PermissionDenied
        error={listError}
        title="Payment schedules denied"
        message="You do not have access to payment schedules for this project."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Payment schedules"
        subtitle={`Customer installment schedules${
          selectedProject ? ` — ${selectedProject.projectName}` : ''
        }. Generate, approve, mark lines due, and issue demands.`}
        actions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Generate schedule
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onChange={(_e, value: TabValue) => {
          setTab(value);
          setPage(1);
        }}
      >
        <Tab value="schedules" label="Schedules" />
        <Tab value="overdue" label="Overdue lines" />
      </Tabs>

      {tab === 'schedules' ? (
        <PaymentScheduleTable
          rows={scheduleRows}
          loading={schedulesQuery.isLoading || schedulesQuery.isFetching}
          error={schedulesQuery.error}
          onRetry={() => void schedulesQuery.refetch()}
          page={page}
          pageSize={pageSize}
          rowCount={schedulesQuery.data?.meta?.total ?? 0}
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
          filterSlot={
            <PaymentScheduleFilters
              value={filters}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
            />
          }
          labels={scheduleLabels}
        />
      ) : (
        <OverdueLinesTable
          rows={overdueRows}
          loading={overdueQuery.isLoading || overdueQuery.isFetching}
          error={overdueQuery.error}
          onRetry={() => void overdueQuery.refetch()}
          page={page}
          pageSize={pageSize}
          rowCount={overdueQuery.data?.meta?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          toolbarActions={
            canRunMarkOverdueJob(caps) ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setMarkOverdueOpen(true)}
              >
                Run mark-overdue job
              </Button>
            ) : undefined
          }
          labels={overdueLabels}
        />
      )}

      <GeneratePaymentScheduleForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bookings={bookings.data ?? []}
        canViewBookings={caps.canViewBookings}
        onCreated={(id) => navigate(paymentScheduleDetailPath(id))}
      />

      <ConfirmDialog
        open={markOverdueOpen}
        title="Run mark-overdue job"
        description="Scan active schedules and mark past-due lines as overdue?"
        confirmLabel="Run job"
        loading={markOverdue.isPending}
        onCancel={() => setMarkOverdueOpen(false)}
        onConfirm={() => {
          void (async () => {
            try {
              const result = await markOverdue.mutateAsync();
              success(
                `Marked ${result.marked} line(s) overdue (${result.schedulesChecked} schedules checked)`,
              );
              setMarkOverdueOpen(false);
            } catch (err) {
              notifyError(getErrorMessage(err, 'Mark overdue job failed'));
            }
          })();
        }}
      />
    </Stack>
  );
}
