import { Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors/PermissionDenied';
import { InvestorDocumentList } from './InvestorDocumentList';
import { InvestorPortalState } from './InvestorPortalState';
import { useInvestorDocumentsView } from './hooks';
import { canViewInvestorDocuments } from './permissions';

export function InvestorDocumentsPage() {
  const { hasPermission } = useAuth();
  const canView = canViewInvestorDocuments(hasPermission);
  const { documents, isLoading, error, refetch, isFetching } =
    useInvestorDocumentsView();

  if (!canView) {
    return (
      <PermissionDenied
        title="Documents unavailable"
        message="You need investor_portal.view to open investor documents."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Investor documents</Typography>
      <Typography color="text.secondary">
        Agreements and report attachments across your authorised projects.
      </Typography>
      <InvestorPortalState
        isLoading={isLoading || isFetching}
        error={error}
        isEmpty={documents.length === 0}
        emptyTitle="No documents yet"
        emptyDescription="When agreements or report attachments are published on your projects, they will appear here."
        onRetry={() => void refetch()}
      >
        <InvestorDocumentList rows={documents} />
      </InvestorPortalState>
    </Stack>
  );
}
