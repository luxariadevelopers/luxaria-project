import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { leadSourceLabel, leadStatusLabel } from '@/leads/labels';
import { resolveLeadCapabilities } from '@/leads/roleAccess';
import { useLeadDetail } from '@/leads/useLeads';

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveLeadCapabilities(hasPermission);
  const query = useLeadDetail(leadId, caps.canView);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Lead unavailable"
        message="You need the lead.view permission to open lead details."
      />
    );
  }

  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const lead = query.data;
  if (!lead && !query.isLoading) {
    return <Alert severity="warning">Lead not found.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{lead?.leadNumber ?? 'Lead'}</Typography>
      {lead ? (
        <>
          <Stack direction="row" spacing={1}>
            <Chip label={leadStatusLabel(lead.status)} />
            <Chip label={leadSourceLabel(lead.source)} variant="outlined" />
          </Stack>
          <Typography>
            <strong>Contact:</strong> {lead.contact.fullName}
          </Typography>
          <Typography>
            <strong>Phone:</strong> {lead.contact.phone ?? '—'}
          </Typography>
          <Typography>
            <strong>Email:</strong> {lead.contact.email ?? '—'}
          </Typography>
          {lead.notes ? (
            <Typography color="text.secondary">{lead.notes}</Typography>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
