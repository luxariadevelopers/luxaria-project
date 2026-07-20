import { Stack, Typography } from '@mui/material';
import type { Control } from 'react-hook-form';
import { FormSection, FormTextField } from '@/components/forms';
import type { PurchaseOrderFormValues } from './validation';

type Props = {
  control: Control<PurchaseOrderFormValues>;
  disabled?: boolean;
};

function AddressBlock({
  control,
  prefix,
  title,
  disabled,
}: {
  control: Control<PurchaseOrderFormValues>;
  prefix: 'billingAddress' | 'deliveryAddress';
  title: string;
  disabled?: boolean;
}) {
  return (
    <FormSection title={title}>
      <FormTextField
        name={`${prefix}.line1`}
        control={control}
        label="Line 1"
        required
        disabled={disabled}
      />
      <FormTextField
        name={`${prefix}.line2`}
        control={control}
        label="Line 2"
        disabled={disabled}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <FormTextField
          name={`${prefix}.city`}
          control={control}
          label="City"
          required
          disabled={disabled}
        />
        <FormTextField
          name={`${prefix}.state`}
          control={control}
          label="State"
          required
          disabled={disabled}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <FormTextField
          name={`${prefix}.pincode`}
          control={control}
          label="Pincode"
          required
          disabled={disabled}
        />
        <FormTextField
          name={`${prefix}.country`}
          control={control}
          label="Country"
          required
          disabled={disabled}
        />
      </Stack>
    </FormSection>
  );
}

/**
 * Billing + delivery address blocks for the PO form.
 */
export function POAddressFields({ control, disabled = false }: Props) {
  return (
    <Stack spacing={2} data-testid="po-address-fields">
      <Typography variant="body2" color="text.secondary">
        Billing and delivery addresses are required on create.
      </Typography>
      <AddressBlock
        control={control}
        prefix="billingAddress"
        title="Billing address"
        disabled={disabled}
      />
      <AddressBlock
        control={control}
        prefix="deliveryAddress"
        title="Delivery address"
        disabled={disabled}
      />
    </Stack>
  );
}
