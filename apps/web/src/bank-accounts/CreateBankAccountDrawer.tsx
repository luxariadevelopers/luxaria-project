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
import { BankAccountType } from './types';
import { useCreateBankAccount } from './useBankAccounts';
import {
  bankAccountCreateSchema,
  type BankAccountCreateFormValues,
} from './validation';

type Option = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  projects: readonly Option[];
  ledgerAccounts: readonly Option[];
  /** Pre-select project from list filter when set. */
  defaultProjectId?: string;
};

const TYPE_OPTIONS = BANK_ACCOUNT_TYPE_OPTIONS.map((value) => ({
  value,
  label: bankAccountTypeLabel(value),
}));

export function CreateBankAccountDrawer({
  open,
  onClose,
  projects,
  ledgerAccounts,
  defaultProjectId = '',
}: Props) {
  const create = useCreateBankAccount();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<BankAccountCreateFormValues>({
      resolver: zodResolver(bankAccountCreateSchema),
      defaultValues: {
        bankName: '',
        branch: '',
        accountHolderName: '',
        accountNumber: '',
        ifsc: '',
        accountType: BankAccountType.Current,
        projectId: defaultProjectId,
        ledgerAccountId: '',
        openingBalance: 0,
        isDefault: false,
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        bankName: '',
        branch: '',
        accountHolderName: '',
        accountNumber: '',
        ifsc: '',
        accountType: BankAccountType.Current,
        projectId: defaultProjectId,
        ledgerAccountId: '',
        openingBalance: 0,
        isDefault: false,
      });
    }
  }, [open, defaultProjectId, reset]);

  const onSubmit = async (values: BankAccountCreateFormValues) => {
    try {
      await create.mutateAsync({
        bankName: values.bankName,
        branch: values.branch?.trim() ? values.branch.trim() : null,
        accountHolderName: values.accountHolderName,
        accountNumber: values.accountNumber,
        ifsc: values.ifsc,
        accountType: values.accountType,
        projectId: values.projectId?.trim()
          ? values.projectId.trim()
          : null,
        ledgerAccountId: values.ledgerAccountId,
        openingBalance: values.openingBalance,
        isDefault: values.isDefault,
      });
      success('Bank account created');
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
          <Typography variant="h6">New bank account</Typography>
          <Typography variant="body2" color="text.secondary">
            Requires bank.manage. IFSC and account number are validated client-side;
            Nest encrypts the account number at rest. Ledger must be an active Bank
            category chart account.
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
            label="Account number"
            required
            autoComplete="off"
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
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending || ledgerAccounts.length === 0}
            >
              Create
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
