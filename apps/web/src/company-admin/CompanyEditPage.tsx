import { useState } from 'react';
import { Alert, Box, Chip, Stack, Tab, Tabs } from '@mui/material';
import { DetailHeader } from '@/components/entity-detail';
import { PageHeader } from '@/layouts/PageHeader';
import { COMPANY_STATUS_LABELS } from './constants';
import { CurrentCompanyBoundary, type CurrentCompanyRenderState } from './CurrentCompanyBoundary';
import { CompanyCapitalPanel } from './CompanyCapitalPanel';
import { CompanyHistoryPanel } from './CompanyHistoryPanel';
import { CompanyLogoPanel } from './CompanyLogoPanel';
import { CompanyProfileForm } from './CompanyProfileForm';
import { CompanyStatutoryDocumentsPanel } from './CompanyStatutoryDocumentsPanel';
import { CompanyStatutoryForm } from './CompanyStatutoryForm';

type ConfigurationTab = 'profile' | 'statutory' | 'capital' | 'logo' | 'history';

type Props = {
  companyId?: string;
  /** Optional route supplied by the eventual route registration. */
  overviewPath?: string;
};

function TabPanel({
  active,
  id,
  children,
}: {
  active: boolean;
  id: ConfigurationTab;
  children: React.ReactNode;
}) {
  return (
    <Box
      role="tabpanel"
      id={`company-${id}-panel`}
      aria-labelledby={`company-${id}-tab`}
      hidden={!active}
    >
      {children}
    </Box>
  );
}

function CompanyConfiguration({
  company,
  canUpdate,
  canUploadLogo,
  overviewPath,
}: CurrentCompanyRenderState & { overviewPath?: string }) {
  const [tab, setTab] = useState<ConfigurationTab>('profile');

  return (
    <Stack spacing={2.5} data-testid="company-edit-page">
      <PageHeader hideTitle />
      <DetailHeader
        title={`${company.tradeName} configuration`}
        code={company.companyCode}
        subtitle="Current authenticated company"
        backTo={overviewPath}
        backLabel="Company overview"
        meta={
          <Chip
            size="small"
            label={COMPANY_STATUS_LABELS[company.status]}
            color={company.status === 'active' ? 'success' : 'default'}
          />
        }
      />

      {!canUpdate && !canUploadLogo ? (
        <Alert severity="info">
          This configuration is read-only. Profile, statutory, and capital updates require
          company.update; logo replacement requires company.upload_logo.
        </Alert>
      ) : null}

      <Tabs
        value={tab}
        onChange={(_event, value: ConfigurationTab) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Company configuration sections"
      >
        <Tab
          id="company-profile-tab"
          aria-controls="company-profile-panel"
          value="profile"
          label="Profile & addresses"
        />
        <Tab
          id="company-statutory-tab"
          aria-controls="company-statutory-panel"
          value="statutory"
          label="Statutory"
        />
        <Tab
          id="company-capital-tab"
          aria-controls="company-capital-panel"
          value="capital"
          label="Capital"
        />
        <Tab
          id="company-logo-tab"
          aria-controls="company-logo-panel"
          value="logo"
          label="Logo"
        />
        <Tab
          id="company-history-tab"
          aria-controls="company-history-panel"
          value="history"
          label="History"
        />
      </Tabs>

      <TabPanel active={tab === 'profile'} id="profile">
        <CompanyProfileForm company={company} canUpdate={canUpdate} />
      </TabPanel>
      <TabPanel active={tab === 'statutory'} id="statutory">
        <Stack spacing={2.5}>
          <CompanyStatutoryForm company={company} canUpdate={canUpdate} />
          <CompanyStatutoryDocumentsPanel company={company} />
        </Stack>
      </TabPanel>
      <TabPanel active={tab === 'capital'} id="capital">
        <CompanyCapitalPanel company={company} canUpdate={canUpdate} />
      </TabPanel>
      <TabPanel active={tab === 'logo'} id="logo">
        <CompanyLogoPanel company={company} canUploadLogo={canUploadLogo} />
      </TabPanel>
      <TabPanel active={tab === 'history'} id="history">
        <CompanyHistoryPanel companyId={company.id} />
      </TabPanel>
    </Stack>
  );
}

export function CompanyEditPage({
  companyId,
  overviewPath = '/administration/company',
}: Props = {}) {
  return (
    <CurrentCompanyBoundary companyId={companyId}>
      {(state) => <CompanyConfiguration {...state} overviewPath={overviewPath} />}
    </CurrentCompanyBoundary>
  );
}

export const CompanyConfigurationPage = CompanyEditPage;
export const CompanySettingsPage = CompanyEditPage;
