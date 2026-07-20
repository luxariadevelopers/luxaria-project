import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { applyApiFieldErrors } from '@/components/forms';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { AccountForm } from '@/chart-of-accounts/AccountForm';
import { flattenAccountTree } from '@/chart-of-accounts/hierarchy';
import { resolveChartOfAccountsCapabilities } from '@/chart-of-accounts/roleAccess';
import { shapeAccountCreatePayload } from '@/chart-of-accounts/shapeAccountPayload';
import {
  useAccountTree,
  useCreateAccount,
} from '@/chart-of-accounts/useChartOfAccounts';
import {
  accountCreateSchema,
  defaultAccountFormValues,
  type AccountFormValues,
} from '@/chart-of-accounts/validation';

/**
 * Create account — `/accounting/chart-of-accounts/new`
 * Optional `?parentId=` from COA “Add child”.
 * Requires `account.manage` (Nest has no `account.create`).
 */
export function AccountCreatePage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentIdParam = searchParams.get('parentId');
  const { success, error: notifyError } = useNotify();
  const caps = resolveChartOfAccountsCapabilities(hasPermission);
  const create = useCreateAccount();

  const treeQuery = useAccountTree(
    undefined,
    Boolean(access) && (caps.canView || caps.canManage),
  );

  const parentOptions = useMemo(
    () => flattenAccountTree(treeQuery.data ?? []),
    [treeQuery.data],
  );

  const parentFromQuery = useMemo(() => {
    if (!parentIdParam) return null;
    return parentOptions.find((a) => a.id === parentIdParam) ?? null;
  }, [parentIdParam, parentOptions]);

  const { control, handleSubmit, watch, setValue, setError, reset } =
    useForm<AccountFormValues>({
      resolver: zodResolver(accountCreateSchema),
      defaultValues: defaultAccountFormValues(),
    });

  useEffect(() => {
    if (!parentFromQuery) return;
    reset(
      defaultAccountFormValues({
        accountType: parentFromQuery.accountType,
        parentAccountId: parentFromQuery.id,
        parentAccountType: parentFromQuery.accountType,
      }),
    );
  }, [parentFromQuery, reset]);

  if (access && !caps.canManage) {
    return (
      <PermissionDenied
        title="Cannot create account"
        message="You need account.manage to create accounts. (There is no account.create code in the Nest catalog.)"
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await create.mutateAsync(
        shapeAccountCreatePayload(values),
      );
      success(`Account ${created.accountCode} created`);
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
      data-testid="account-create-page"
      noValidate
    >
      <Alert severity="info" variant="outlined">
        Defaults match Nest: control accounts start with manual posting off;
        others allow manual posting. Project/party dimensions are off unless
        enabled.
      </Alert>

      {treeQuery.error && !isForbiddenError(treeQuery.error) ? (
        <RetryPanel
          error={treeQuery.error}
          onRetry={() => void treeQuery.refetch()}
          forceRetry
        />
      ) : null}

      <AccountForm
        mode="create"
        control={control}
        watch={watch}
        setValue={setValue}
        parentOptions={parentOptions}
        disabled={!caps.canManage}
        disabledReason="account.manage required"
      />

      <Stack direction="row" spacing={1.5}>
        <Button
          type="submit"
          variant="contained"
          disabled={create.isPending || !caps.canManage}
        >
          {create.isPending ? 'Creating…' : 'Create account'}
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
