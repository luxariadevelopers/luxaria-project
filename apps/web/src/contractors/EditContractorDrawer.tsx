import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { CONTRACTOR_TYPE_OPTIONS } from './labels';
import type { ContractorListRow, ContractorType } from './types';
import { useUpdateContractor } from './useContractors';
import { formDrawerPaperSx } from '@/components/forms';
import {
  emptyContractorCreateForm,
  optionalTrimmed,
  parseOptionalRating,
  parseWorkCategories,
  contractorCreateSchema,
  type ContractorCreateFormValues,
} from './validation';

type Props = {
  contractor: ContractorListRow | null;
  open: boolean;
  onClose: () => void;
};

export function EditContractorDrawer({ contractor, open, onClose }: Props) {
  const update = useUpdateContractor();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<ContractorCreateFormValues>({
    resolver: zodResolver(contractorCreateSchema),
    defaultValues: emptyContractorCreateForm(),
  });

  useEffect(() => {
    if (!open || !contractor) return;
    reset({
      legalName: contractor.legalName,
      tradeName: contractor.tradeName ?? '',
      contractorType: contractor.contractorType,
      pan: contractor.pan ?? '',
      gstin: contractor.gstin ?? '',
      email: contractor.email ?? '',
      phone: contractor.phone ?? '',
      contactPerson: contractor.contactPerson ?? '',
      workCategoriesText: contractor.workCategories.join(', '),
      rating: contractor.rating == null ? '' : String(contractor.rating),
      ifsc: '',
      accountNumber: '',
      bankName: '',
    });
  }, [open, contractor, reset]);

  const onSubmit = async (values: ContractorCreateFormValues) => {
    if (!contractor) return;
    try {
      await update.mutateAsync({
        id: contractor.id,
        input: {
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
        },
      });
      success('Contractor updated');
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
      slotProps={{ paper: { sx: formDrawerPaperSx(440) } }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%' }}
      >
        <Stack spacing={2}>
          <Typography variant="h6">Edit contractor</Typography>
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
          />
          <FormTextField name="rating" control={control} label="Rating (0–5)" />
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose}>Cancel</Button>
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
