import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { DateInput, FormSelect, FormTextField, MoneyInput } from '@/components/forms';
import { useNotify } from '@/components/NotificationProvider';
import {
  createSessionSchema,
  type CreateSessionFormValues,
} from './validation';
import { useCreateReconciliationSession } from './useBankReconciliation';

type Option = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  bankAccounts: readonly Option[];
  onCreated?: (sessionId: string) => void;
};

export function CreateSessionDrawer({
  open,
  onClose,
  bankAccounts,
  onCreated,
}: Props) {
  const create = useCreateReconciliationSession();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      bankAccountId: '',
      statementFrom: '',
      statementTo: '',
      statementOpeningBalance: 0,
      statementClosingBalance: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        bankAccountId: bankAccounts[0]?.id ?? '',
        statementFrom: '',
        statementTo: '',
        statementOpeningBalance: 0,
        statementClosingBalance: 0,
        notes: '',
      });
    }
  }, [open, bankAccounts, reset]);

  const onSubmit = async (values: CreateSessionFormValues) => {
    try {
      const session = await create.mutateAsync({
        bankAccountId: values.bankAccountId,
        statementFrom: values.statementFrom.slice(0, 10),
        statementTo: values.statementTo.slice(0, 10),
        statementOpeningBalance: values.statementOpeningBalance,
        statementClosingBalance: values.statementClosingBalance,
        notes: values.notes?.trim() || undefined,
      });
      success('Reconciliation session created');
      onCreated?.(session.id);
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: 320, sm: 420 }, p: 2.5 }} data-testid="create-recon-session-drawer">
        <Typography variant="h6" sx={{ mb: 2 }}>
          New reconciliation session
        </Typography>
        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <FormSelect
            name="bankAccountId"
            control={control}
            label="Bank account"
            options={bankAccounts.map((b) => ({ value: b.id, label: b.label }))}
          />
          <DateInput name="statementFrom" control={control} label="Statement from" />
          <DateInput name="statementTo" control={control} label="Statement to" />
          <MoneyInput
            name="statementOpeningBalance"
            control={control}
            label="Statement opening balance"
            allowNegative
          />
          <MoneyInput
            name="statementClosingBalance"
            control={control}
            label="Statement closing balance"
            allowNegative
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={create.isPending}>
              Create
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
