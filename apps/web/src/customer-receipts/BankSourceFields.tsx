import { Alert, Stack } from '@mui/material';
import type { Control } from 'react-hook-form';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { paymentModeRequiresBankFields } from './validation';
import type { CustomerReceiptCreateFormValues } from './validation';
import type { BankAccountOption } from './types';

type Props = {
  control: Control<CustomerReceiptCreateFormValues>;
  paymentMode: string;
  bankAccounts: readonly BankAccountOption[];
  canViewBankAccounts: boolean;
  banksLoading?: boolean;
};

export function BankSourceFields({
  control,
  paymentMode,
  bankAccounts,
  canViewBankAccounts,
  banksLoading,
}: Props) {
  const needsBank = paymentModeRequiresBankFields(paymentMode);

  if (!needsBank) {
    return null;
  }

  return (
    <Stack spacing={2} data-testid="bank-source-fields">
      {!canViewBankAccounts ? (
        <Alert severity="warning" variant="outlined">
          Bank account list requires `bank.view`. Enter the company bank
          account id manually if known, or ask an admin for access.
        </Alert>
      ) : null}

      {canViewBankAccounts ? (
        <FormSelect
          name="companyBankAccountId"
          control={control}
          label="Company bank account"
          disabled={banksLoading}
          options={bankAccounts.map((b) => ({
            value: b.id,
            label: b.label,
          }))}
        />
      ) : (
        <FormTextField
          name="companyBankAccountId"
          control={control}
          label="Company bank account id"
        />
      )}

      <FormTextField
        name="transactionReference"
        control={control}
        label="Transaction reference"
        helperText="Must be unique per company bank account (Nest rejects duplicates)."
      />
    </Stack>
  );
}
