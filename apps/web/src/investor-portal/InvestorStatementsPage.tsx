import { Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors/PermissionDenied';
import { InvestorPortalState } from './InvestorPortalState';
import { InvestorReceiptDownloads } from './InvestorReceiptDownloads';
import { InvestorStatementFilters } from './InvestorStatementFilters';
import { useInvestorStatementsView } from './hooks';
import { canViewInvestorDocuments } from './permissions';

export function InvestorStatementsPage() {
  const { hasPermission } = useAuth();
  const canView = canViewInvestorDocuments(hasPermission);
  const {
    filteredStatements,
    filters,
    setFilters,
    projectOptions,
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useInvestorStatementsView();

  if (!canView) {
    return (
      <PermissionDenied
        title="Statements unavailable"
        message="You need investor_portal.view to open investor statements."
      />
    );
  }

  const allStatements = data?.statements ?? [];

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Investor statements</Typography>
      <Typography color="text.secondary">
        Published project reports and your contribution receipts, filtered to
        authorised portal projects only.
      </Typography>
      <InvestorPortalState
        isLoading={isLoading || isFetching}
        error={error}
        isEmpty={allStatements.length === 0}
        emptyTitle="No statements yet"
        emptyDescription="Reports and posted receipts from your authorised projects will appear here."
        onRetry={() => void refetch()}
      >
        <InvestorStatementFilters
          rows={filteredStatements}
          filters={filters}
          projectOptions={projectOptions}
          onFiltersChange={setFilters}
        />
        <InvestorReceiptDownloads rows={allStatements} />
      </InvestorPortalState>
    </Stack>
  );
}
