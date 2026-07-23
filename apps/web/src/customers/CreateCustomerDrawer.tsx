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
import { fundingTypeLabel } from './kycState';
import { CustomerFundingType } from './types';
import { useCreateCustomer } from './useCustomers';
import { formDrawerPaperSx } from '@/components/forms';
import {
  customerCreateSchema,
  type CustomerCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

const FUNDING_OPTIONS = Object.values(CustomerFundingType).map((value) => ({
  value,
  label: fundingTypeLabel(value),
}));

export function CreateCustomerDrawer({ open, onClose, onCreated }: Props) {
  const create = useCreateCustomer();
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
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: CustomerCreateFormValues) => {
    try {
      const hasJoint = Boolean(
        values.jointFullName ||
          values.jointPan ||
          values.jointAadhaar ||
          values.jointPhone ||
          values.jointEmail,
      );
      const created = await create.mutateAsync({
        fullName: values.fullName,
        pan: values.pan ?? null,
        aadhaar: values.aadhaar ?? null,
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
        address: {
          addressLine1: values.addressLine1 ?? null,
          city: values.city ?? null,
          state: values.state ?? null,
          pincode: values.pincode ?? null,
        },
        jointApplicant: hasJoint
          ? {
              fullName: values.jointFullName ?? null,
              relationship: values.jointRelationship ?? null,
              pan: values.jointPan ?? null,
              aadhaar: values.jointAadhaar ?? null,
              phone: values.jointPhone ?? null,
              email: values.jointEmail ?? null,
            }
          : undefined,
      });
      success('Customer created');
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
        paper: { sx: formDrawerPaperSx(480) },
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
          New customer
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Requires customer.manage. PAN and contact are validated client-side;
          Aadhaar is encrypted at rest (only last-4 shown later).
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
            label="Aadhaar (12 digits)"
          />
          <FormTextField name="email" control={control} label="Email" />
          <FormTextField name="phone" control={control} label="Phone" />
          <FormTextField
            name="alternatePhone"
            control={control}
            label="Alternate phone"
          />
          <FormTextField
            name="occupation"
            control={control}
            label="Occupation"
          />
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
          <FormTextField
            name="addressLine1"
            control={control}
            label="Address"
          />
          <FormTextField name="city" control={control} label="City" />
          <FormTextField name="state" control={control} label="State" />
          <FormTextField name="pincode" control={control} label="Pincode" />

          <Divider />
          <Typography variant="subtitle2">Joint applicant (optional)</Typography>
          <FormTextField
            name="jointFullName"
            control={control}
            label="Joint applicant name"
          />
          <FormTextField
            name="jointRelationship"
            control={control}
            label="Relationship"
          />
          <FormTextField name="jointPan" control={control} label="Joint PAN" />
          <FormTextField
            name="jointAadhaar"
            control={control}
            label="Joint Aadhaar"
          />
          <FormTextField
            name="jointPhone"
            control={control}
            label="Joint phone"
          />
          <FormTextField
            name="jointEmail"
            control={control}
            label="Joint email"
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ pt: 2 }}>
          <Button onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={create.isPending}
          >
            {create.isPending ? 'Saving…' : 'Create'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
