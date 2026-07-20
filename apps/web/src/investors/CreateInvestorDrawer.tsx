import { useEffect } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { investorTypeLabel } from './kycState';
import { InvestorType } from './types';
import { useCreateInvestor } from './useInvestors';
import {
  investorCreateSchema,
  type InvestorCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

const TYPE_OPTIONS = Object.values(InvestorType).map((value) => ({
  value,
  label: investorTypeLabel(value),
}));

export function CreateInvestorDrawer({ open, onClose, onCreated }: Props) {
  const create = useCreateInvestor();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<InvestorCreateFormValues>({
    resolver: zodResolver(investorCreateSchema),
    defaultValues: {
      investorType: InvestorType.Individual,
      legalName: '',
      pan: '',
      gstin: '',
      cin: '',
      directorId: '',
      email: '',
      phone: '',
      ifsc: '',
      accountNumber: '',
      bankName: '',
    },
  });

  const investorType = useWatch({ control, name: 'investorType' });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: InvestorCreateFormValues) => {
    try {
      const created = await create.mutateAsync({
        investorType: values.investorType,
        legalName: values.legalName,
        pan: values.pan ?? null,
        gstin: values.gstin ?? null,
        cin: values.cin ?? null,
        directorId: values.directorId ?? null,
        contact: {
          email: values.email ?? null,
          phone: values.phone ?? null,
        },
        bankDetails:
          values.bankName || values.ifsc || values.accountNumber
            ? {
                bankName: values.bankName ?? null,
                ifsc: values.ifsc ?? null,
                accountNumber: values.accountNumber ?? null,
              }
            : undefined,
      });
      success('Investor created');
      onCreated(created.id);
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
        paper: { sx: { width: { xs: '100%', sm: 440 } } },
      }}
    >
      <Box sx={{ p: 3 }} data-testid="create-investor-drawer">
        <Typography variant="h6" sx={{ mb: 1 }}>
          New investor
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          PAN / GSTIN / CIN are validated when provided. Company type requires
          CIN; director-as-project-investor requires a director id. Bank fields
          are optional on create and never shown in the list.
        </Typography>

        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <FormSelect
            name="investorType"
            control={control}
            label="Investor type"
            options={TYPE_OPTIONS}
          />
          <FormTextField
            name="legalName"
            control={control}
            label="Legal name"
            required
          />
          <FormTextField name="pan" control={control} label="PAN" />
          <FormTextField name="gstin" control={control} label="GSTIN" />
          <FormTextField
            name="cin"
            control={control}
            label="CIN"
            required={investorType === InvestorType.Company}
            helperText={
              investorType === InvestorType.Company
                ? 'Required for company investors'
                : undefined
            }
          />
          {investorType === InvestorType.DirectorAsProjectInvestor ? (
            <FormTextField
              name="directorId"
              control={control}
              label="Director id"
              required
              helperText="Mongo id of the linked director"
            />
          ) : null}
          <FormTextField name="email" control={control} label="Email" />
          <FormTextField name="phone" control={control} label="Phone" />

          <Divider />
          <Typography variant="subtitle2">Bank (optional — not listed)</Typography>
          <FormTextField name="bankName" control={control} label="Bank name" />
          <FormTextField name="ifsc" control={control} label="IFSC" />
          <FormTextField
            name="accountNumber"
            control={control}
            label="Account number"
            helperText="Encrypted at rest; never shown in the investors table"
          />

          <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
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
