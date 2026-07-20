import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { applyApiFieldErrors } from '@/components/forms';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { AccountForm } from '@/chart-of-accounts/AccountForm';
import {
  collectDescendantIds,
  flattenAccountTree,
} from '@/chart-of-accounts/hierarchy';
import { resolveAccountControls } from '@/chart-of-accounts/protectedControls';
import { resolveChartOfAccountsCapabilities } from '@/chart-of-accounts/roleAccess';
import { shapeAccountUpdatePayload } from '@/chart-of-accounts/shapeAccountPayload';
import {
  useAccount,
  useAccountTree,
  useUpdateAccount,
} from '@/chart-of-accounts/useChartOfAccounts';
import {
  accountToFormValues,
  accountUpdateSchema,
  defaultAccountFormValues,
  type AccountFormValues,
} from '@/chart-of-accounts/validation';

/**
 * Edit account — `/accounting/chart-of-accounts/:accountId/edit`
 * View with `account.view`; save requires `account.manage`.
 */
export function AccountEditPage() {
  const { accountId = '' } = useParams<{ accountId: string }>();
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotify();
  const caps = resolveChartOfAccountsCapabilities(hasPermission);
  const update = useUpdateAccount();

  const accountQuery = useAccount(
    accountId || null,
    Boolean(access) && caps.canView,
  );
  const treeQuery = useAccountTree(undefined, Boolean(access) && caps.canView);

  const parentOptions = useMemo(() => {
    const flat = flattenAccountTree(treeQuery.data ?? []);
    if (!accountId) return flat;
    const blocked = collectDescendantIds(treeQuery.data ?? [], accountId);
    blocked.add(accountId);
    return flat.filter((a) => !blocked.has(a.id));
  }, [treeQuery.data, accountId]);

  const controls = accountQuery.data
    ? resolveAccountControls(accountQuery.data)
    : null;

  const { control, handleSubmit, watch, setValue, setError, reset } =
    useForm<AccountFormValues>({
      resolver: zodResolver(accountUpdateSchema),
      defaultValues: defaultAccountFormValues(),
    });

  useEffect(() => {
    if (!accountQuery.data) return;
    const parentFromTree = flattenAccountTree(treeQuery.data ?? []).find(
      (a) => a.id === accountQuery.data.parentAccountId,
    );
    reset(
      accountToFormValues({
        ...accountQuery.data,
        parentAccountType: parentFromTree?.accountType ?? null,
      }),
    );
  }, [accountQuery.data, reset, treeQuery.data]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Account unavailable"
        message="You need account.view to open an account."
      />
    );
  }

  if (!accountId) {
    return (
      <EmptyState
        title="Missing account"
        description="No account id in the URL."
      />
    );
  }

  if (accountQuery.error) {
    if (isForbiddenError(accountQuery.error)) {
      return (
        <PermissionDenied
          title="Account denied"
          message="The server denied access to this account (403)."
        />
      );
    }
    return (
      <RetryPanel
        error={accountQuery.error}
        onRetry={() => void accountQuery.refetch()}
        forceRetry
      />
    );
  }

  if (accountQuery.isLoading || !accountQuery.data) {
    return <Typography color="text.secondary">Loading account…</Typography>;
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!caps.canManage) return;
    try {
      const updated = await update.mutateAsync({
        id: accountId,
        input: shapeAccountUpdatePayload(values),
      });
      success(`Account ${updated.accountCode} updated`);
      navigate('/accounting/chart-of-accounts');
    } catch (err) {
      applyApiFieldErrors(setError, err);
      notifyError(getErrorMessage(err));
    }
  });

  return (
    <Stack
      component="form"
      spacing={2.5}
      onSubmit={(e) => void onSubmit(e)}
      data-testid="account-edit-page"
      noValidate
    >
      {!caps.canManage ? (
        <Alert severity="warning" variant="outlined">
          Read-only. Saving requires account.manage (no account.update in the
          Nest catalog).
        </Alert>
      ) : null}

      {controls?.isProtectedSystem ? (
        <Alert severity="info" variant="outlined">
          System-seeded account — type cannot be changed.
        </Alert>
      ) : null}

      <AccountForm
        mode="edit"
        control={control}
        watch={watch}
        setValue={setValue}
        parentOptions={parentOptions}
        disabled={!caps.canManage}
        disabledReason="account.manage required to edit"
      />

      <Stack direction="row" spacing={1.5}>
        <Button
          type="submit"
          variant="contained"
          disabled={update.isPending || !caps.canManage}
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          onClick={() => navigate('/accounting/chart-of-accounts')}
        >
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}
