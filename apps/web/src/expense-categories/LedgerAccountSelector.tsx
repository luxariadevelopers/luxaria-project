import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { fetchAccounts } from '@/chart-of-accounts/api';
import { AccountStatus, AccountType } from '@/chart-of-accounts/types';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { expenseCategoryKeys } from './queryKeys';

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** When false, skip `account.view` fetch and show text fallback. */
  canViewAccounts: boolean;
};

/**
 * Ledger picker for expense categories — active COA accounts with
 * `accountType === expense` (Nest `resolveLedgerAccount` rule).
 */
export function LedgerAccountSelector<T extends FieldValues>({
  name,
  control,
  label = 'Default ledger account',
  required = true,
  disabled = false,
  canViewAccounts,
}: Props<T>) {
  const ledgerQuery = useQuery({
    queryKey: expenseCategoryKeys.ledgerOptions(),
    queryFn: () =>
      fetchAccounts({
        accountType: AccountType.Expense,
        status: AccountStatus.Active,
        limit: 200,
      }),
    enabled: canViewAccounts,
    staleTime: 60_000,
    retry: false,
  });

  const options = useMemo(() => {
    const rows = (ledgerQuery.data ?? []).filter(
      (a) => !a.isControlAccount || a.allowManualPosting,
    );
    return rows.map((a) => ({
      value: a.id,
      label: `${a.accountCode} · ${a.accountName}`,
    }));
  }, [ledgerQuery.data]);

  if (canViewAccounts && options.length > 0) {
    return (
      <FormSelect
        name={name}
        control={control}
        label={label}
        options={options}
        required={required}
        disabled={disabled || ledgerQuery.isLoading}
      />
    );
  }

  return (
    <>
      <FormTextField
        name={name}
        control={control}
        label={`${label} id`}
        required={required}
        disabled={disabled}
        helperText={
          canViewAccounts
            ? ledgerQuery.isLoading
              ? 'Loading expense ledgers…'
              : 'No active expense ledger accounts found. Enter account ObjectId.'
            : 'Enter account ObjectId (account.view needed for picker).'
        }
      />
      {canViewAccounts && ledgerQuery.error ? (
        <Typography variant="caption" color="error">
          Could not load expense ledgers. You can still paste an account id.
        </Typography>
      ) : null}
    </>
  );
}
