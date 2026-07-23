import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { CreateLeadDrawer } from '@/leads/CreateLeadDrawer';
import { LeadFilters, type LeadFilterState } from '@/leads/LeadFilters';
import { LeadTable } from '@/leads/LeadTable';
import { resolveLeadCapabilities } from '@/leads/roleAccess';
import { TransitionLeadDialog } from '@/leads/TransitionLeadDialog';
import type { LeadListRow, LeadSource, LeadStatus } from '@/leads/types';
import { useLeadsList } from '@/leads/useLeads';

export function LeadsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveLeadCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<LeadFilterState>({
    status: '',
    source: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<LeadListRow | null>(
    null,
  );

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as LeadStatus | undefined,
      source: (filters.source || undefined) as LeadSource | undefined,
    }),
    [page, pageSize, search, filters, selectedProjectId],
  );

  const leadsQuery = useLeadsList(listQuery, caps.canView);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Leads unavailable"
        message="You need the lead.view permission to manage CRM leads."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Leads"
        subtitle="CRM leads — capture, pipeline transitions, and conversion to customers."
        actions={
          caps.canManage ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New lead
            </Button>
          ) : undefined
        }
      />
      <LeadTable
        rows={leadsQuery.data?.items ?? []}
        loading={leadsQuery.isLoading || leadsQuery.isFetching}
        error={leadsQuery.error}
        onRetry={() => void leadsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={leadsQuery.data?.meta?.total ?? 0}
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
          <LeadFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        canManage={caps.canManage}
        onTransition={setTransitionTarget}
      />
      <CreateLeadDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
      />
      <TransitionLeadDialog
        open={Boolean(transitionTarget)}
        lead={transitionTarget}
        onClose={() => setTransitionTarget(null)}
      />
    </Stack>
  );
}
