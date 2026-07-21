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
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { CONTRACTOR_TYPE_OPTIONS } from './labels';
import { useCreateContractor } from './useContractors';
import type { ContractorType } from './types';
import {
  emptyContractorCreateForm,
  optionalTrimmed,
  parseOptionalRating,
  parseWorkCategories,
  contractorCreateSchema,
  type ContractorCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function CreateContractorDrawer({ open, onClose, onCreated }: Props) {
  const create = useCreateContractor();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<ContractorCreateFormValues>({
    resolver: zodResolver(contractorCreateSchema),
    defaultValues: emptyContractorCreateForm(),
  });

  useEffect(() => {
    if (!open) {
      reset(emptyContractorCreateForm());
    }
  }, [open, reset]);

  const onSubmit = async (values: ContractorCreateFormValues) => {
    try {
      const created = await create.mutateAsync({
        legalName: values.legalName.trim(),
        tradeName: optionalTrimmed(values.tradeName),
        contractorType: values.contractorType as ContractorType,
        pan: optionalTrimmed(values.pan)?.toUpperCase() ?? null,
        gstin: optionalTrimmed(values.gstin)?.toUpperCase() ?? null,
        contact: {
          email: optionalTrimmed(values.email)?.toLowerCase() ?? null,
          phone: optionalTrimmed(values.phone),
          contactPerson: optionalTrimmed(values.contactPerson),
        },
        workCategories: parseWorkCategories(values.workCategoriesText),
        rating: parseOptionalRating(values.rating),
        bankDetails:
          values.bankName.trim() ||
          values.ifsc.trim() ||
          values.accountNumber.trim()
            ? {
                bankName: optionalTrimmed(values.bankName),
                ifsc: optionalTrimmed(values.ifsc)?.toUpperCase() ?? null,
                accountNumber:
                  optionalTrimmed(values.accountNumber.replace(/\s+/g, '')) ??
                  null,
              }
            : undefined,
      });
      success('Contractor created');
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
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%' }}
      >
        <Stack spacing={2}>
          <Typography variant="h6">New contractor</Typography>
          <FormTextField
            name="legalName"
            control={control}
            label="Legal name"
            required
          />
          <FormTextField name="tradeName" control={control} label="Trade name" />
          <FormSelect
            name="contractorType"
            control={control}
            label="Contractor type"
            options={CONTRACTOR_TYPE_OPTIONS}
            required
          />
          <FormTextField name="pan" control={control} label="PAN" />
          <FormTextField name="gstin" control={control} label="GSTIN" />
          <FormTextField name="email" control={control} label="Email" />
          <FormTextField name="phone" control={control} label="Phone" />
          <FormTextField
            name="contactPerson"
            control={control}
            label="Contact person"
          />
          <FormTextField
            name="workCategoriesText"
            control={control}
            label="Work categories"
            helperText="Comma-separated, e.g. brickwork, plastering"
          />
          <FormTextField name="rating" control={control} label="Rating (0–5)" />
          <Divider />
          <Typography variant="subtitle2">Bank (optional)</Typography>
          <FormTextField name="bankName" control={control} label="Bank name" />
          <FormTextField name="ifsc" control={control} label="IFSC" />
          <FormTextField
            name="accountNumber"
            control={control}
            label="Account number"
          />
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              Create
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
