import { useEffect } from 'react';
import { formDrawerPaperSx } from '@/components/forms';
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
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { useCreateVendor } from './useVendors';
import {
  emptyVendorCreateForm,
  optionalTrimmed,
  parseMaterialCategories,
  parseOptionalRating,
  vendorCreateSchema,
  type VendorCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function CreateVendorDrawer({ open, onClose, onCreated }: Props) {
  const create = useCreateVendor();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<VendorCreateFormValues>({
    resolver: zodResolver(vendorCreateSchema),
    defaultValues: emptyVendorCreateForm(),
  });

  useEffect(() => {
    if (!open) {
      reset(emptyVendorCreateForm());
    }
  }, [open, reset]);

  const onSubmit = async (values: VendorCreateFormValues) => {
    try {
      const created = await create.mutateAsync({
        legalName: values.legalName.trim(),
        tradeName: optionalTrimmed(values.tradeName),
        pan: optionalTrimmed(values.pan)?.toUpperCase() ?? null,
        gstin: optionalTrimmed(values.gstin)?.toUpperCase() ?? null,
        contact: {
          email: optionalTrimmed(values.email)?.toLowerCase() ?? null,
          phone: optionalTrimmed(values.phone),
          contactPerson: optionalTrimmed(values.contactPerson),
        },
        materialCategories: parseMaterialCategories(
          values.materialCategoriesText,
        ),
        paymentTerms: optionalTrimmed(values.paymentTerms),
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
      success('Vendor created');
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
        paper: { sx: formDrawerPaperSx(440) },
      }}
    >
      <Box sx={{ p: 3 }} data-testid="create-vendor-drawer">
        <Typography variant="h6" sx={{ mb: 1 }}>
          New vendor
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          GSTIN / PAN are validated when provided. Bank account numbers are
          encrypted at rest and never shown in the vendors table.
        </Typography>

        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <FormTextField
            name="legalName"
            control={control}
            label="Legal name"
            required
          />
          <FormTextField name="tradeName" control={control} label="Trade name" />
          <FormTextField name="pan" control={control} label="PAN" />
          <FormTextField name="gstin" control={control} label="GSTIN" />
          <FormTextField
            name="contactPerson"
            control={control}
            label="Contact person"
          />
          <FormTextField name="email" control={control} label="Email" />
          <FormTextField name="phone" control={control} label="Phone" />
          <FormTextField
            name="materialCategoriesText"
            control={control}
            label="Material categories"
            helperText="Comma-separated, e.g. cement, steel"
          />
          <FormTextField
            name="paymentTerms"
            control={control}
            label="Payment terms"
          />
          <FormTextField
            name="rating"
            control={control}
            label="Rating (0–5)"
          />

          <Divider />
          <Typography variant="subtitle2">
            Bank (optional — not listed)
          </Typography>
          <FormTextField name="bankName" control={control} label="Bank name" />
          <FormTextField name="ifsc" control={control} label="IFSC" />
          <FormTextField
            name="accountNumber"
            control={control}
            label="Account number"
            helperText="Encrypted at rest; never shown in the vendors table"
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
