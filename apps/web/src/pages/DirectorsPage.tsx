import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { CreateDirectorDialog } from '@/directors/CreateDirectorDialog';
import { DirectorTable } from '@/directors/DirectorTable';
import { resolveDirectorCapabilities } from '@/directors/roleAccess';
import {
  useActiveShareholding,
  useDirectorsList,
} from '@/directors/useDirectors';

/**
 * Directors list (Micro Phase 031).
 * `GET /directors` — `director.view`
 * Optional shareholding column via `GET /company-shareholding` — `shareholding.view`
 */
export function DirectorsPage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const caps = resolveDirectorCapabilities(hasPermission);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
    }),
    [page, pageSize, search],
  );

  const directorsQuery = useDirectorsList(listQuery, caps.canView);
  const shareholdingQuery = useActiveShareholding(
    undefined,
    caps.canView && caps.canViewShareholding,
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Directors unavailable"
        message="You need the director.view permission to manage directors."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Company directors master — codes, DIN/PAN, status and current equity
        shareholding (separate from project investment).
      </Typography>

      <DirectorTable
        rows={directorsQuery.data?.items ?? []}
        loading={directorsQuery.isLoading || directorsQuery.isFetching}
        error={directorsQuery.error}
        onRetry={() => void directorsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={directorsQuery.data?.meta?.total ?? 0}
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
        showShareholding={caps.canViewShareholding}
        holdingsByDirector={shareholdingQuery.data?.holdings ?? []}
        toolbarActions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New director
            </Button>
          ) : undefined
        }
      />

      {caps.canCreate ? (
        <CreateDirectorDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            void navigate(`/capital/directors/${id}`);
          }}
        />
      ) : null}
    </Stack>
  );
}
