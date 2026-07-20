import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { fundingTypeLabel } from './kycState';
import type { CustomerListRow } from './types';
import { CustomerFundingType } from './types';
import { useUpdateCustomer } from './useCustomers';
import {
  customerCreateSchema,
  type CustomerCreateFormValues,
} from './validation';

type Props = {
  customer: CustomerListRow | null;
  open: boolean;
  onClose: () => void;
};

const FUNDING_OPTIONS = Object.values(CustomerFundingType).map((value) => ({
  value,
  label: fundingTypeLabel(value),
}));

export function EditCustomerDrawer({ customer, open, onClose }: Props) {
  const update = useUpdateCustomer();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<CustomerCreateFormValues>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: {
      fullName: '',
      pan: '',
      aadhaar: '',
      email: '',
      phone: '',
      alternatePhone: '',
      occupation: '',
      fundingType: CustomerFundingType.OwnFunds,
      loanBank: '',
      addressLine1: '',
      city: '',
      state: '',
      pincode: '',
      jointFullName: '',
      jointRelationship: '',
      jointPan: '',
      jointAadhaar: '',
      jointPhone: '',
      jointEmail: '',
    },
  });

  const fundingType = useWatch({ control, name: 'fundingType' });

  useEffect(() => {
    if (customer && open) {
      reset({
        fullName: customer.fullName,
        pan: customer.pan ?? '',
        aadhaar: '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        alternatePhone: '',
        occupation: '',
        fundingType: customer.fundingType,
        loanBank: customer.loanBank ?? '',
        addressLine1: '',
        city: '',
        state: '',
        pincode: '',
        jointFullName: '',
        jointRelationship: '',
        jointPan: '',
        jointAadhaar: '',
        jointPhone: '',
        jointEmail: '',
      });
    }
  }, [customer, open, reset]);

  const onSubmit = async (values: CustomerCreateFormValues) => {
    if (!customer) return;
    try {
      await update.mutateAsync({
        id: customer.id,
        input: {
          fullName: values.fullName,
          pan: values.pan ?? null,
          aadhaar: values.aadhaar ?? undefined,
          occupation: values.occupation ?? null,
          fundingType: values.fundingType,
          loanBank:
            values.fundingType === CustomerFundingType.OwnFunds
              ? null
              : (values.loanBank ?? null),
          contact: {
            email: values.email ?? null,
            phone: values.phone ?? null,
            alternatePhone: values.alternatePhone ?? null,
          },
        },
      });
      success('Customer updated');
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
      <Box
        component="form"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          Edit customer
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {customer?.customerCode ?? ''} — requires customer.manage. Leave
          Aadhaar blank to keep the existing value.
        </Typography>

        <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', pb: 2 }}>
          <FormTextField
            name="fullName"
            control={control}
            label="Full name"
            required
          />
          <FormTextField name="pan" control={control} label="PAN" />
          <FormTextField
            name="aadhaar"
            control={control}
            label="Aadhaar (replace)"
          />
          <FormTextField name="email" control={control} label="Email" />
          <FormTextField name="phone" control={control} label="Phone" />
          <FormSelect
            name="fundingType"
            control={control}
            label="Funding type"
            options={FUNDING_OPTIONS}
          />
          {fundingType !== CustomerFundingType.OwnFunds ? (
            <FormTextField
              name="loanBank"
              control={control}
              label="Loan bank"
              required
            />
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ pt: 2 }}>
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
      </Box>
    </Drawer>
  );
}
