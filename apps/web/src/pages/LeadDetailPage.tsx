import { Chip, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityDetailLayout,
  SummaryCards,
} from '@/components/entity-detail';
import { leadSourceLabel, leadStatusLabel } from '@/leads/labels';
import { resolveLeadCapabilities } from '@/leads/roleAccess';
import { useLeadDetail } from '@/leads/useLeads';

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveLeadCapabilities(hasPermission);
  const query = useLeadDetail(leadId, caps.canView);

  const lead = query.data;
  const canView = Boolean(access) && caps.canView;

  return (
    <EntityDetailLayout
      canView={canView}
      loading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      notFound={!lead && !query.isLoading && !query.isError}
      permissionTitle="Lead unavailable"
      permissionMessage="You need the lead.view permission to open lead details."
      notFoundTitle="Lead not found"
      notFoundDescription="This lead may have been removed or is outside your access."
      header={
        <DetailHeader
          title={lead?.contact.fullName ?? 'Lead'}
          code={lead?.leadNumber}
          backTo="/sales/leads"
          backLabel="Back to leads"
          meta={
            lead ? (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={leadStatusLabel(lead.status)} />
                <Chip
                  size="small"
                  label={leadSourceLabel(lead.source)}
                  variant="outlined"
                />
              </Stack>
            ) : undefined
          }
        />
      }
      summary={
        lead ? (
          <SummaryCards
            fields={[
              {
                id: 'phone',
                label: 'Phone',
                value: lead.contact.phone ?? '—',
              },
              {
                id: 'email',
                label: 'Email',
                value: lead.contact.email ?? '—',
              },
              {
                id: 'source',
                label: 'Source',
                value: leadSourceLabel(lead.source),
              },
              {
                id: 'status',
                label: 'Status',
                value: leadStatusLabel(lead.status),
              },
            ]}
          />
        ) : undefined
      }
    >
      {lead?.notes ? (
        <Typography color="text.secondary">{lead.notes}</Typography>
      ) : null}
    </EntityDetailLayout>
  );
}
