import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { CreateCashAccountDrawer } from '@/cash-accounts/CreateCashAccountDrawer';
import { resolveCashAccountCapabilities } from '@/cash-accounts/roleAccess';
import { CashAccountKind } from '@/cash-accounts/types';
import { useCashAccountUserOptions } from '@/cash-accounts/useCashAccounts';
import {
  applyApiFieldErrors,
  DateInput,
  FormSection,
  FormTextField,
} from '@/components/forms';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { CurrentBalanceCard } from '@/petty-cash-requests/CurrentBalanceCard';
import { RequirementItemsGrid } from '@/petty-cash-requests/RequirementItemsGrid';
import { resolvePettyCashRequestCapabilities } from '@/petty-cash-requests/roleAccess';
import {
  useCashAccountBalance,
  useCreatePettyCashRequirement,
  usePettyCashAccounts,
  useSubmitPettyCashRequirement,
} from '@/petty-cash-requests/usePettyCashRequests';
import {
  defaultPettyCashRequestValues,
  pettyCashRequestFormSchema,
  shapeCreatePayload,
  type PettyCashRequestFormValues,
} from '@/petty-cash-requests/validation';

/**
 * Weekly petty-cash request create — `/accounting/petty-cash/requests/new`
 * (Micro Phase 049).
 *
 * Nest: `POST /petty-cash-requirements` + optional `POST …/submit`
 * Permissions: `petty_cash.request` (+ `cash.view` for account/balance).
 */
export function PettyCashRequestCreatePage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();
  const caps = resolvePettyCashRequestCapabilities(hasPermission);
  const cashCaps = resolveCashAccountCapabilities(hasPermission);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  const create = useCreatePettyCashRequirement();
  const submit = useSubmitPettyCashRequirement();

  const accountsQuery = usePettyCashAccounts(
    selectedProjectId,
    Boolean(access) && caps.canRequest && caps.canViewCash,
  );
  const usersQuery = useCashAccountUserOptions(
    selectedProjectId,
    Boolean(selectedProjectId) && cashCaps.canManage,
  );

  const { control, handleSubmit, setError, setValue } =
    useForm<PettyCashRequestFormValues>({
      resolver: zodResolver(pettyCashRequestFormSchema),
      defaultValues: defaultPettyCashRequestValues({
        projectId: selectedProjectId ?? '',
      }),
      mode: 'onBlur',
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'requirementItems',
  });

  const accountId = useWatch({ control, name: 'pettyCashAccountId' });

  useEffect(() => {
    if (selectedProjectId) {
      setValue('projectId', selectedProjectId);
    }
  }, [selectedProjectId, setValue]);

  const balanceQuery = useCashAccountBalance(
    accountId || null,
    Boolean(accountId) && caps.canViewCash,
  );

  const accounts = useMemo(
    () =>
      (accountsQuery.data ?? []).filter(
        (a) => a.status === 'active' || a.status === 'pending_handover',
      ),
    [accountsQuery.data],
  );

  useEffect(() => {
    if (!accountId && accounts[0]?.id) {
      setValue('pettyCashAccountId', accounts[0].id, {
        shouldValidate: true,
      });
    }
  }, [accountId, accounts, setValue]);

  const userOptions = useMemo(
    () =>
      (usersQuery.data ?? []).map((u) => ({
        id: u.id,
        label: u.fullName?.trim()
          ? `${u.fullName}${u.userCode ? ` · ${u.userCode}` : ''}`
          : u.userCode || u.id,
      })),
    [usersQuery.data],
  );

  if (access && !caps.canRequest) {
    return (
      <PermissionDenied
        title="Cannot create petty-cash request"
        message="You need petty_cash.request to create weekly cash requests."
      />
    );
  }

  if (access && caps.canRequest && !caps.canViewCash) {
    return (
      <PermissionDenied
        title="Cash accounts unavailable"
        message="Selecting a petty-cash account requires cash.view in addition to petty_cash.request."
        showHomeLink={false}
      />
    );
  }

  if (accountsQuery.error) {
    if (isForbiddenError(accountsQuery.error)) {
      return (
        <PermissionDenied
          title="Cash accounts denied"
          message="The server denied access to cash accounts (403)."
        />
      );
    }
    return (
      <RetryPanel
        error={accountsQuery.error}
        onRetry={() => void accountsQuery.refetch()}
        forceRetry
      />
    );
  }

  if (accountsQuery.isLoading) {
    return (
      <Typography color="text.secondary">Loading petty-cash accounts…</Typography>
    );
  }

  if (accounts.length === 0) {
    return (
      <Stack spacing={2} data-testid="petty-cash-request-no-accounts">
        <EmptyState
          title="No petty-cash accounts"
          description="Create an active petty-cash account for this project before requesting weekly float."
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {cashCaps.canManage && selectedProjectId ? (
            <Button
              variant="contained"
              onClick={() => setCreateAccountOpen(true)}
            >
              Create petty-cash account
            </Button>
          ) : null}
          <Button
            variant="outlined"
            component={RouterLink}
            to="/accounting/cash-accounts"
          >
            Open Cash accounts
          </Button>
        </Stack>
        {!cashCaps.canManage ? (
          <Alert severity="info">
            Creating an account needs <strong>cash.manage</strong>. Ask finance
            to create a petty-cash account under Accounting → Cash accounts, then
            return here.
          </Alert>
        ) : null}
        {selectedProjectId ? (
          <CreateCashAccountDrawer
            open={createAccountOpen}
            onClose={() => setCreateAccountOpen(false)}
            projectId={selectedProjectId}
            users={userOptions}
            canViewUsers={hasPermission('user.view')}
            canViewAccounts={hasPermission('account.view')}
            lockKind={CashAccountKind.PettyCash}
            onCreated={() => {
              void accountsQuery.refetch();
            }}
          />
        ) : null}
      </Stack>
    );
  }

  const busy = create.isPending || submit.isPending;
  const projectLabel = selectedProject
    ? selectedProject.projectCode
      ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
      : selectedProject.projectName
    : selectedProjectId;

  const persist = async (
    values: PettyCashRequestFormValues,
    thenSubmit: boolean,
  ) => {
    try {
      const created = await create.mutateAsync(shapeCreatePayload(values));
      if (thenSubmit) {
        await submit.mutateAsync(created.id);
        success(`Request ${created.requestNumber} submitted for approval`);
      } else {
        success(`Draft ${created.requestNumber} saved`);
      }
      navigate(`/accounting/petty-cash/requests/${created.id}`);
    } catch (err) {
      applyApiFieldErrors(setError, err);
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="petty-cash-request-create-page"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit((values) => persist(values, false))();
      }}
    >
      <Typography color="text.secondary">
        Create a weekly petty-cash requirement for {projectLabel}. Item amounts
        must be positive and the week span cannot exceed 7 days.
      </Typography>

      <Alert severity="info" variant="outlined">
        Nest snapshots current cash balance and previous unsettled float on
        create/submit. Duplicate open requests for the same account + week are
        rejected.
      </Alert>

      <FormSection title="Week & account">
        <Controller
          name="pettyCashAccountId"
          control={control}
          render={({ field, fieldState }) => (
            <FormControl
              size="small"
              fullWidth
              disabled={busy}
              error={Boolean(fieldState.error)}
              required
            >
              <InputLabel id="pcr-account">Petty-cash account</InputLabel>
              <Select
                {...field}
                labelId="pcr-account"
                label="Petty-cash account"
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.accountCode} — {a.accountName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
        <DateInput
          name="weekStartDate"
          control={control}
          label="Week start"
          required
        />
        <DateInput
          name="weekEndDate"
          control={control}
          label="Week end"
          required
        />
      </FormSection>

      <CurrentBalanceCard
        liveBalance={balanceQuery.data ?? null}
        liveLoading={balanceQuery.isLoading}
        liveErrorMessage={
          balanceQuery.error ? getErrorMessage(balanceQuery.error) : null
        }
      />

      <RequirementItemsGrid
        control={control}
        fields={fields}
        append={append}
        remove={remove}
        disabled={busy}
      />

      <FormSection title="Justification">
        <FormTextField
          name="justification"
          control={control}
          label="Justification"
          required
          multiline
          minRows={3}
          disabled={busy}
          helperText="Required for PM/finance approval — why this week’s float is needed (not optional)."
        />
      </FormSection>

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button
          type="button"
          onClick={() => navigate('/accounting/petty-cash/requests')}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" variant="outlined" disabled={busy}>
          {create.isPending && !submit.isPending
            ? 'Saving…'
            : 'Save draft'}
        </Button>
        <Button
          type="button"
          variant="contained"
          disabled={busy}
          onClick={() => {
            void handleSubmit((values) => persist(values, true))();
          }}
        >
          {submit.isPending ? 'Submitting…' : 'Save & submit'}
        </Button>
      </Stack>
    </Stack>
  );
}
