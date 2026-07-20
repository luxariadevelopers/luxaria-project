import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import {
  BANK_ACCOUNT_TYPE_OPTIONS,
  bankAccountTypeLabel,
} from './labels';
import type { PublicCompanyBankAccount } from './types';
import { useUpdateBankAccount } from './useBankAccounts';
import {
  bankAccountUpdateSchema,
  type BankAccountUpdateFormValues,
} from './validation';

type Option = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  account: PublicCompanyBankAccount;
  projects: readonly Option[];
  ledgerAccounts: readonly Option[];
};

const TYPE_OPTIONS = BANK_ACCOUNT_TYPE_OPTIONS.map((value) => ({
  value,
  label: bankAccountTypeLabel(value),
}));

export function EditBankAccountDrawer({
  open,
  onClose,
  account,
  projects,
  ledgerAccounts,
}: Props) {
  const update = useUpdateBankAccount();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<BankAccountUpdateFormValues>({
      resolver: zodResolver(bankAccountUpdateSchema),
      defaultValues: {
        bankName: account.bankName,
        branch: account.branch ?? '',
        accountHolderName: account.accountHolderName,
        accountNumber: '',
        ifsc: account.ifsc,
        accountType: account.accountType,
        projectId: account.projectId ?? '',
        ledgerAccountId: account.ledgerAccountId,
        openingBalance: account.openingBalance,
        isDefault: account.isDefault,
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        bankName: account.bankName,
        branch: account.branch ?? '',
        accountHolderName: account.accountHolderName,
        accountNumber: '',
        ifsc: account.ifsc,
        accountType: account.accountType,
        projectId: account.projectId ?? '',
        ledgerAccountId: account.ledgerAccountId,
        openingBalance: account.openingBalance,
        isDefault: account.isDefault,
      });
    }
  }, [open, account, reset]);

  const onSubmit = async (values: BankAccountUpdateFormValues) => {
    try {
      await update.mutateAsync({
        id: account.id,
        input: {
          bankName: values.bankName,
          branch: values.branch?.trim() ? values.branch.trim() : null,
          accountHolderName: values.accountHolderName,
          ...(values.accountNumber?.trim()
            ? { accountNumber: values.accountNumber.trim() }
            : {}),
          ifsc: values.ifsc,
          accountType: values.accountType,
          projectId: values.projectId?.trim()
            ? values.projectId.trim()
            : null,
          ledgerAccountId: values.ledgerAccountId,
          openingBalance: values.openingBalance,
          isDefault: values.isDefault,
        },
      });
      success('Bank account updated');
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
        paper: { sx: { width: { xs: '100%', sm: 460 } } },
      }}
    >
      <Box sx={{ p: 2.5 }} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Typography variant="h6">Edit bank account</Typography>
          <Typography variant="body2" color="text.secondary">
            {account.accountCode}. Leave account number blank to keep the
            existing encrypted value. Requires bank.manage.
          </Typography>

          <FormTextField
            name="bankName"
            control={control}
            label="Bank name"
            required
          />
          <FormTextField name="branch" control={control} label="Branch" />
          <FormTextField
            name="accountHolderName"
            control={control}
            label="Account holder"
            required
          />
          <FormTextField
            name="accountNumber"
            control={control}
            label="New account number (optional)"
            autoComplete="off"
            helperText={`Current masked: ${account.maskedAccountNumber}`}
          />
          <FormTextField
            name="ifsc"
            control={control}
            label="IFSC"
            required
            slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
          />
          <FormSelect
            name="accountType"
            control={control}
            label="Account type"
            options={TYPE_OPTIONS}
          />
          <FormSelect
            name="projectId"
            control={control}
            label="Project (optional)"
            options={[
              { value: '', label: 'Company-level' },
              ...projects.map((p) => ({ value: p.id, label: p.label })),
            ]}
          />
          <FormSelect
            name="ledgerAccountId"
            control={control}
            label="Ledger account"
            options={ledgerAccounts.map((a) => ({
              value: a.id,
              label: a.label,
            }))}
          />
          <FormTextField
            name="openingBalance"
            control={control}
            label="Opening balance"
            type="number"
          />
          <FormCheckbox
            name="isDefault"
            control={control}
            label="Set as default for this scope"
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={update.isPending}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
