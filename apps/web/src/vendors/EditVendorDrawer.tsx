import { useEffect } from 'react';
import { formDrawerPaperSx } from '@/components/forms';
import {
  Box,
  Button,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { VendorListRow } from './types';
import { useUpdateVendor } from './useVendors';
import {
  emptyVendorCreateForm,
  optionalTrimmed,
  parseMaterialCategories,
  parseOptionalRating,
  vendorCreateSchema,
  type VendorCreateFormValues,
} from './validation';

type Props = {
  vendor: VendorListRow | null;
  open: boolean;
  onClose: () => void;
};

export function EditVendorDrawer({ vendor, open, onClose }: Props) {
  const update = useUpdateVendor();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<VendorCreateFormValues>({
    resolver: zodResolver(vendorCreateSchema),
    defaultValues: emptyVendorCreateForm(),
  });

  useEffect(() => {
    if (vendor && open) {
      reset({
        ...emptyVendorCreateForm(),
        legalName: vendor.legalName,
        tradeName: vendor.tradeName ?? '',
        pan: vendor.pan ?? '',
        gstin: vendor.gstin ?? '',
        email: vendor.email ?? '',
        phone: vendor.phone ?? '',
        contactPerson: vendor.contactPerson ?? '',
        materialCategoriesText: vendor.materialCategories.join(', '),
        paymentTerms: vendor.paymentTerms ?? '',
        rating: vendor.rating == null ? '' : String(vendor.rating),
      });
    }
  }, [vendor, open, reset]);

  const onSubmit = async (values: VendorCreateFormValues) => {
    if (!vendor) return;
    try {
      await update.mutateAsync({
        id: vendor.id,
        input: {
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
        },
      });
      success('Vendor updated');
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
      <Box sx={{ p: 3 }} data-testid="edit-vendor-drawer">
        <Typography variant="h6" sx={{ mb: 1 }}>
          Edit vendor
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {vendor?.vendorCode ?? 'Vendor'} — bank details are not shown or
          edited here (avoid exposing full account numbers).
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
            helperText="Comma-separated"
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

          <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
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
