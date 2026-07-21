import type { ReactNode } from 'react';
import { Avatar, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { DetailHeader, SummaryCards } from '@/components/entity-detail';
import { formatDateTime, formatInr } from '@/format';
import { COMPANY_STATUS_LABELS, financialYearMonthLabel } from './constants';
import { CurrentCompanyBoundary, type CurrentCompanyRenderState } from './CurrentCompanyBoundary';
import { CompanyHistoryPanel } from './CompanyHistoryPanel';
import { formatCompanyAddress, resolveCompanyLogoUrl } from './formatters';
import type { PublicCompany } from './types';

type Props = {
  companyId?: string;
  /** Optional route supplied by the eventual route registration. */
  configurationPath?: string;
};

function Fact({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Stack>
  );
}

function CompanyLogo({ company }: { company: PublicCompany }) {
  const logoUrl = resolveCompanyLogoUrl(company.logo);
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { sm: 'center' } }}
    >
      <Avatar
        src={logoUrl ?? undefined}
        alt={`${company.tradeName} logo`}
        variant="rounded"
        sx={{ width: 88, height: 88, fontSize: 28 }}
      >
        {company.tradeName.slice(0, 2).toUpperCase()}
      </Avatar>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1">Company logo</Typography>
        <Typography variant="body2" color="text.secondary">
          {company.logo ? 'A logo is stored for this company.' : 'No logo has been uploaded.'}
        </Typography>
      </Stack>
    </Stack>
  );
}

function CompanyOverview({
  company,
  canUpdate,
  canUploadLogo,
  configurationPath,
}: CurrentCompanyRenderState & { configurationPath?: string }) {
  const summary = [
    {
      id: 'authorised-capital',
      label: 'Authorised share capital',
      value: formatInr(company.authorisedShareCapital),
    },
    {
      id: 'paid-up-capital',
      label: 'Paid-up share capital',
      value: formatInr(company.paidUpShareCapital),
    },
    {
      id: 'financial-year',
      label: 'Financial year starts',
      value: financialYearMonthLabel(company.financialYearStartMonth),
    },
    {
      id: 'primary',
      label: 'Tenant role',
      value: company.isPrimary ? 'Primary company' : 'Company',
    },
    {
      id: 'updated',
      label: 'Last updated',
      value: company.updatedAt ? formatDateTime(company.updatedAt) : 'Not available',
    },
  ];

  return (
    <Stack spacing={2.5} data-testid="company-detail-page">
      <DetailHeader
        title={company.tradeName}
        code={company.companyCode}
        subtitle={company.legalName}
        meta={
          <Chip
            size="small"
            label={COMPANY_STATUS_LABELS[company.status]}
            color={company.status === 'active' ? 'success' : 'default'}
          />
        }
      />

      {configurationPath && (canUpdate || canUploadLogo) ? (
        <Box>
          <Button component={RouterLink} to={configurationPath} variant="contained">
            Configure company
          </Button>
        </Box>
      ) : null}

      <SummaryCards fields={summary} />

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <CompanyLogo company={company} />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Profile
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          <Fact label="Trade name" value={company.tradeName} />
          <Fact label="Legal name" value={company.legalName} />
          <Fact label="Email" value={company.email} />
          <Fact label="Phone" value={company.phone} />
          <Fact label="Website" value={company.website} />
          <Fact
            label="Financial year starts"
            value={financialYearMonthLabel(company.financialYearStartMonth)}
          />
          <Fact label="Company code" value={company.companyCode} />
          <Fact label="Primary company" value={company.isPrimary ? 'Yes' : 'No'} />
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Registered address
          </Typography>
          <Typography variant="body2">{formatCompanyAddress(company.registeredAddress)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Corporate address
          </Typography>
          <Typography variant="body2">{formatCompanyAddress(company.corporateAddress)}</Typography>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Statutory details
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          <Fact label="CIN" value={company.cin} />
          <Fact label="PAN" value={company.pan} />
          <Fact label="TAN" value={company.tan} />
          <Fact label="GSTIN" value={company.gstin} />
        </Box>
      </Paper>

      <CompanyHistoryPanel companyId={company.id} />
    </Stack>
  );
}

export function CompanyDetailPage({
  companyId,
  configurationPath = '/administration/company/settings',
}: Props = {}) {
  return (
    <CurrentCompanyBoundary companyId={companyId}>
      {(state) => <CompanyOverview {...state} configurationPath={configurationPath} />}
    </CurrentCompanyBoundary>
  );
}

export const CompanyOverviewPage = CompanyDetailPage;
