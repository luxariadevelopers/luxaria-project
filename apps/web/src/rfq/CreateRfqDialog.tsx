import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { DateInput, FormTextField } from '@/components/forms';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { useVendorOptions } from '@/quotations/useQuotations';
import { useCreateRfq } from './useRfqs';

const schema = z.object({
  purchaseRequestId: z.string().trim().min(1, 'Purchase request is required'),
  title: z.string().trim().min(1, 'Title is required').max(300),
  closingDate: z.string().min(1, 'Closing date is required'),
  notes: z.string().trim().max(2000).optional(),
  vendorIds: z.array(z.string()).min(1, 'Select at least one vendor'),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  defaultPurchaseRequestId?: string;
};

export function CreateRfqDialog({
  open,
  onClose,
  onCreated,
  defaultPurchaseRequestId = '',
}: Props) {
  const { selectedProjectId } = useProject();
  const create = useCreateRfq();
  const { success, error: notifyError } = useNotify();
  const vendors = useVendorOptions('', open);
  const [vendorSearch, setVendorSearch] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseRequestId: defaultPurchaseRequestId,
      title: '',
      closingDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      notes: '',
      vendorIds: [],
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        purchaseRequestId: defaultPurchaseRequestId,
        title: '',
        closingDate: new Date(Date.now() + 14 * 86400000)
          .toISOString()
          .slice(0, 10),
        notes: '',
        vendorIds: [],
      });
    }
  }, [open, defaultPurchaseRequestId, reset]);

  const vendorOptions = useMemo(() => {
    const rows = vendors.data ?? [];
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (v) =>
        v.legalName.toLowerCase().includes(q) ||
        v.vendorCode.toLowerCase().includes(q),
    );
  }, [vendors.data, vendorSearch]);

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedProjectId) {
      notifyError('Select a project first');
      return;
    }
    try {
      const created = await create.mutateAsync({
        projectId: selectedProjectId,
        purchaseRequestId: values.purchaseRequestId.trim(),
        title: values.title.trim(),
        vendorIds: values.vendorIds,
        closingDate: values.closingDate,
        notes: values.notes?.trim() || null,
      });
      success(`RFQ ${created.rfqNumber} created`);
      onCreated?.(created.id);
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={create.isPending ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="create-rfq-dialog"
    >
      <DialogTitle>Create RFQ from purchase request</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField
            name="purchaseRequestId"
            control={control}
            label="Purchase request id"
            required
            disabled={create.isPending}
          />
          <FormTextField
            name="title"
            control={control}
            label="Title"
            required
            disabled={create.isPending}
          />
          <DateInput
            name="closingDate"
            control={control}
            label="Closing date"
            required
          />
          <Controller
            name="vendorIds"
            control={control}
            render={({ field }) => (
              <Autocomplete
                multiple
                options={vendorOptions}
                getOptionLabel={(opt) =>
                  [opt.vendorCode, opt.legalName].filter(Boolean).join(' — ')
                }
                value={vendorOptions.filter((v) => field.value.includes(v.id))}
                onChange={(_, next) => field.onChange(next.map((v) => v.id))}
                onInputChange={(_, value) => setVendorSearch(value)}
                disableCloseOnSelect
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.id}>
                    <FormControlLabel
                      control={<Checkbox checked={selected} size="small" />}
                      label={[option.vendorCode, option.legalName]
                        .filter(Boolean)
                        .join(' — ')}
                    />
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Invited vendors"
                    size="small"
                    error={Boolean(errors.vendorIds)}
                    helperText={errors.vendorIds?.message}
                  />
                )}
              />
            )}
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
            disabled={create.isPending}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={create.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={create.isPending}
          onClick={() => void onSubmit()}
        >
          {create.isPending ? 'Creating…' : 'Create draft'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
