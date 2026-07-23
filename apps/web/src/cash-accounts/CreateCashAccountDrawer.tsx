import { useEffect, useMemo } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { fetchAccounts } from '@/chart-of-accounts/api';
import { AccountCategory, AccountStatus } from '@/chart-of-accounts/types';
import { formDrawerPaperSx } from '@/components/forms';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { CASH_ACCOUNT_KIND_OPTIONS } from './labels';
import { CashAccountKind } from './types';
import { useCreateCashAccount } from './useCashAccounts';
import {
  cashAccountCreateSchema,
  type CashAccountCreateFormValues,
} from './validation';

type Option = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  users: readonly Option[];
  canViewUsers: boolean;
  canViewAccounts: boolean;
  /** When set, kind is fixed (e.g. Petty cash from request create). */
  lockKind?: (typeof CashAccountKind)[keyof typeof CashAccountKind];
  onCreated?: () => void;
};

export function CreateCashAccountDrawer({
  open,
  onClose,
  projectId,
  users,
  canViewUsers,
  canViewAccounts,
  lockKind,
  onCreated,
}: Props) {
  const create = useCreateCashAccount();
  const { success, error: notifyError } = useNotify();
  const initialKind = lockKind ?? CashAccountKind.PettyCash;

  const { control, handleSubmit, reset } =
    useForm<CashAccountCreateFormValues>({
      resolver: zodResolver(cashAccountCreateSchema),
      defaultValues: {
        accountName: '',
        kind: initialKind,
        projectId,
        custodianUserId: '',
        ledgerAccountId: '',
        maximumHoldingLimit: 50000,
        replenishmentLevel: 10000,
        openingBalance: 0,
      },
    });

  const kind = useWatch({ control, name: 'kind' });

  const ledgerQuery = useQuery({
    queryKey: ['cash-accounts', 'ledger-options', kind],
    queryFn: async () => {
      const [cash, petty] = await Promise.all([
        fetchAccounts({
          accountCategory: AccountCategory.Cash,
          status: AccountStatus.Active,
          limit: 100,
        }),
        fetchAccounts({
          accountCategory: AccountCategory.PettyCash,
          status: AccountStatus.Active,
          limit: 100,
        }),
      ]);
      const byId = new Map<string, (typeof cash)[number]>();
      for (const a of [...cash, ...petty]) {
        if (!a.isControlAccount || a.allowManualPosting) {
          byId.set(a.id, a);
        }
      }
      return [...byId.values()];
    },
    enabled: open && canViewAccounts,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!open) {
      reset({
        accountName: '',
        kind: initialKind,
        projectId,
        custodianUserId: '',
        ledgerAccountId: '',
        maximumHoldingLimit: 50000,
        replenishmentLevel: 10000,
        openingBalance: 0,
      });
    } else {
      reset((prev) => ({ ...prev, projectId, kind: initialKind }));
    }
  }, [open, projectId, initialKind, reset]);

  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.label })),
    [users],
  );

  const ledgerOptions = useMemo(
    () =>
      (ledgerQuery.data ?? []).map((a) => ({
        value: a.id,
        label: `${a.accountCode} · ${a.accountName}`,
      })),
    [ledgerQuery.data],
  );

  const onSubmit = async (values: CashAccountCreateFormValues) => {
    try {
      await create.mutateAsync({
        accountName: values.accountName,
        kind: lockKind ?? values.kind,
        projectId: values.projectId,
        custodianUserId: values.custodianUserId,
        ledgerAccountId: values.ledgerAccountId,
        maximumHoldingLimit: values.maximumHoldingLimit,
        replenishmentLevel: values.replenishmentLevel,
        openingBalance: values.openingBalance,
      });
      success('Cash account created');
      onCreated?.();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(420) },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 2.5, height: '100%' }}
        data-testid="create-cash-account-drawer"
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Typography variant="h6">New cash account</Typography>
          <Typography variant="body2" color="text.secondary">
            Requires one active custodian. Ledger must be a Cash or Petty Cash
            chart account (`cash.manage`).
          </Typography>

          <FormTextField
            name="accountName"
            control={control}
            label="Account name"
            required
          />
          {lockKind ? null : (
            <FormSelect
              name="kind"
              control={control}
              label="Kind"
              options={[...CASH_ACCOUNT_KIND_OPTIONS]}
              required
            />
          )}
          {canViewUsers && userOptions.length > 0 ? (
            <FormSelect
              name="custodianUserId"
              control={control}
              label="Custodian"
              options={userOptions}
              required
            />
          ) : (
            <FormTextField
              name="custodianUserId"
              control={control}
              label="Custodian user id"
              required
              helperText={
                canViewUsers
                  ? 'No active users for this project.'
                  : 'Enter user ObjectId (user.view needed for picker).'
              }
            />
          )}
          {canViewAccounts && ledgerOptions.length > 0 ? (
            <FormSelect
              name="ledgerAccountId"
              control={control}
              label="Ledger account"
              options={ledgerOptions}
              required
            />
          ) : (
            <FormTextField
              name="ledgerAccountId"
              control={control}
              label="Ledger account id"
              required
              helperText={
                canViewAccounts
                  ? 'No Cash / Petty Cash ledger accounts found.'
                  : 'Enter account ObjectId (account.view needed for picker).'
              }
            />
          )}
          <FormTextField
            name="maximumHoldingLimit"
            control={control}
            label="Maximum holding limit"
            type="number"
            required
          />
          <FormTextField
            name="replenishmentLevel"
            control={control}
            label="Replenishment level"
            type="number"
            required
          />
          <FormTextField
            name="openingBalance"
            control={control}
            label="Opening balance"
            type="number"
          />

          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
