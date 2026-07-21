import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { resolveUnitRegistrationCapabilities } from '@/unit-registrations/roleAccess';
import { UnitRegistrationTable } from '@/unit-registrations/UnitRegistrationTable';
import { useUnitRegistrationsList } from '@/unit-registrations/useUnitRegistrations';

export function UnitRegistrationsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveUnitRegistrationCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useMemo(
    () => ({ page, limit: pageSize, projectId: selectedProjectId ?? undefined }),
    [page, pageSize, selectedProjectId],
  );

  const query = useUnitRegistrationsList(
    listQuery,
    caps.canView && Boolean(selectedProjectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Unit registrations unavailable"
        message="You need the registration.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to list unit registrations.</Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Sub-registrar registration records for sold units.
      </Typography>
      <UnitRegistrationTable
        rows={query.data?.items ?? []}
        loading={query.isLoading || query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={query.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </Stack>
  );
}
