import { useEffect } from 'react';
import {
  Box,
  Button,
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
import type { InvestorListRow } from './types';
import { InvestorType } from './types';
import { useUpdateInvestor } from './useInvestors';
import {
  investorCreateSchema,
  type InvestorCreateFormValues,
} from './validation';

type Props = {
  investor: InvestorListRow | null;
  open: boolean;
  onClose: () => void;
};

const TYPE_OPTIONS = Object.values(InvestorType).map((value) => ({
  value,
  label: investorTypeLabel(value),
}));

export function EditInvestorDrawer({ investor, open, onClose }: Props) {
  const update = useUpdateInvestor();
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
    if (investor && open) {
      reset({
        investorType: investor.investorType,
        legalName: investor.legalName,
        pan: investor.pan ?? '',
        gstin: investor.gstin ?? '',
        cin: investor.cin ?? '',
        directorId: investor.directorId ?? '',
        email: investor.email ?? '',
        phone: investor.phone ?? '',
        ifsc: '',
        accountNumber: '',
        bankName: '',
      });
    }
  }, [investor, open, reset]);

  const onSubmit = async (values: InvestorCreateFormValues) => {
    if (!investor) return;
    try {
      await update.mutateAsync({
        id: investor.id,
        input: {
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
        },
      });
      success('Investor updated');
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
      <Box sx={{ p: 3 }} data-testid="edit-investor-drawer">
        <Typography variant="h6" sx={{ mb: 1 }}>
          Edit investor
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {investor?.investorCode} — bank fields are not edited from the list
          (keeps account data off this screen).
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
          />
          {investorType === InvestorType.DirectorAsProjectInvestor ? (
            <FormTextField
              name="directorId"
              control={control}
              label="Director id"
              required
            />
          ) : null}
          <FormTextField name="email" control={control} label="Email" />
          <FormTextField name="phone" control={control} label="Phone" />
          <Stack direction="row" spacing={1}>
            <Button onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={update.isPending}
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
