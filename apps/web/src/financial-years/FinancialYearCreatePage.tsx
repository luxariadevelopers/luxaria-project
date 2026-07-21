import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { FINANCIAL_YEAR_ROUTE_BASE } from './constants';
import { FinancialYearForm } from './FinancialYearForm';
import { resolveFinancialYearCapabilities } from './permissions';
import type { FinancialYearCompany } from './types';
import {
  useCreateFinancialYear,
  useFinancialYearCompany,
} from './useFinancialYears';
import {
  toCreateFinancialYearInput,
  type FinancialYearFormValues,
} from './validation';

export function FinancialYearCreatePage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { user, access, hasPermission } = useAuth();
  const capabilities = resolveFinancialYearCapabilities(hasPermission);
  const canCreate = Boolean(access) && capabilities.canManage;
  const canReadCompany = hasPermission('company.view');
  const companyQuery = useFinancialYearCompany(
    user?.companyId,
    canCreate && canReadCompany,
  );
  const companyId = user?.companyId ?? companyQuery.data?.id ?? null;
  const mutation = useCreateFinancialYear();
  const [serverError, setServerError] = useState<unknown>();

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!capabilities.canManage) {
    return (
      <PermissionDenied
        title="Financial year creation unavailable"
        message="You need the financial_year.manage permission to create a financial year."
      />
    );
  }

  const company: FinancialYearCompany = companyQuery.data ?? {
    id: companyId ?? '',
    companyCode: companyId ?? 'Primary company',
    legalName: 'Server-resolved company',
    tradeName: 'Server-resolved company',
    isPrimary: false,
  };

  const submit = async (values: FinancialYearFormValues) => {
    setServerError(undefined);
    try {
      const created = await mutation.mutateAsync(
        toCreateFinancialYearInput(values, companyId),
      );
      notify.success(`${created.name} created successfully`);
      void navigate(
        capabilities.canView
          ? `${FINANCIAL_YEAR_ROUTE_BASE}/${created.id}`
          : '/',
        { replace: true },
      );
    } catch (error) {
      setServerError(error);
      notify.error('Financial year could not be created');
    }
  };

  return (
    <Stack spacing={2.5} data-testid="financial-year-create-page">
      <Stack spacing={0.5}>
        <Typography variant="h5">Create financial year</Typography>
        <Typography variant="body2" color="text.secondary">
          Add a non-overlapping date range for the authenticated company.
          Overlap is checked authoritatively by the server.
        </Typography>
      </Stack>

      {companyQuery.error && user?.companyId ? (
        <Alert severity="info" variant="outlined">
          The optional company label lookup is unavailable. Creation remains
          scoped to your authenticated company id.
        </Alert>
      ) : null}

      <FinancialYearForm
        company={company}
        submitting={mutation.isPending}
        serverError={serverError}
        onSubmit={submit}
        onCancel={() => void navigate(FINANCIAL_YEAR_ROUTE_BASE)}
      />
    </Stack>
  );
}
