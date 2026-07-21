import type { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { COMPANY_PERMISSIONS } from './constants';
import { useCurrentCompany } from './hooks';
import type { PublicCompany } from './types';

export type CurrentCompanyRenderState = {
  company: PublicCompany;
  canUpdate: boolean;
  canUploadLogo: boolean;
  refetch: () => void;
};

type Props = {
  /**
   * Optional route-company id. It is used only for an equality check and is
   * never sent to the API. The request always uses AuthUser.companyId or the
   * backend's primary-company endpoint.
   */
  companyId?: string;
  children: (state: CurrentCompanyRenderState) => ReactNode;
};

export function CurrentCompanyBoundary({ companyId, children }: Props) {
  const params = useParams<{ companyId?: string; id?: string }>();
  const routeCompanyId = companyId ?? params.companyId ?? params.id;
  const { user, access, hasPermission } = useAuth();
  const authenticatedCompanyId = user?.companyId ?? null;
  const canView = Boolean(access) && hasPermission(COMPANY_PERMISSIONS.view);
  const routeMismatchBeforeFetch = Boolean(
    routeCompanyId && authenticatedCompanyId && routeCompanyId !== authenticatedCompanyId,
  );

  const companyQuery = useCurrentCompany(
    authenticatedCompanyId,
    Boolean(access) && canView && !routeMismatchBeforeFetch,
  );

  const routeMismatchAfterFetch = Boolean(
    routeCompanyId && companyQuery.data && routeCompanyId !== companyQuery.data.id,
  );

  if (!access) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 6 }}
        data-testid="company-access-loading"
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (routeMismatchBeforeFetch || routeMismatchAfterFetch) {
    return (
      <PermissionDenied
        title="Company unavailable"
        message="This route does not match your authenticated company."
      />
    );
  }

  if (!canView || (companyQuery.error && isForbiddenError(companyQuery.error))) {
    return (
      <PermissionDenied
        error={companyQuery.error}
        title="Company unavailable"
        message="You need company.view to open company administration."
      />
    );
  }

  if (companyQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} data-testid="company-loading">
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (companyQuery.error) {
    return (
      <RetryPanel
        error={companyQuery.error}
        onRetry={() => void companyQuery.refetch()}
        forceRetry
      />
    );
  }

  if (!companyQuery.data) {
    return (
      <EmptyState
        title="Company not found"
        description="No current company is available for this authenticated tenant."
        actionLabel="Try again"
        onAction={() => void companyQuery.refetch()}
      />
    );
  }

  return children({
    company: companyQuery.data,
    canUpdate: hasPermission(COMPANY_PERMISSIONS.update),
    canUploadLogo: hasPermission(COMPANY_PERMISSIONS.uploadLogo),
    refetch: () => {
      void companyQuery.refetch();
    },
  });
}
