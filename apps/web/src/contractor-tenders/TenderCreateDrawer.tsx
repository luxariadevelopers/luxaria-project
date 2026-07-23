import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { DateInput } from '@/components/forms/DateInput';
import { FormSection } from '@/components/forms/FormSection';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { useCreateContractorTender } from './useContractorTenders';
import {
  defaultTenderCreateFormValues,
  formValuesToCreateInput,
  tenderCreateFormSchema,
  type TenderCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  canManage: boolean;
};

export function TenderCreateDrawer({
  open,
  onClose,
  projectId,
  canManage,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateContractorTender();

  const { control, handleSubmit, reset } = useForm<TenderCreateFormValues>({
    resolver: zodResolver(tenderCreateFormSchema),
    defaultValues: defaultTenderCreateFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultTenderCreateFormValues());
  }, [open, reset]);

  const onSubmit = async (values: TenderCreateFormValues) => {
    if (!canManage) return;
    try {
      await create.mutateAsync(formValuesToCreateInput(values, projectId));
      success('Tender draft created');
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
        paper: { sx: { width: { xs: '100%', sm: 480 } } },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%', overflow: 'auto' }}
        data-testid="tender-create-drawer"
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          New contractor tender
        </Typography>
        <Stack spacing={3}>
          <FormSection title="Details">
            <FormTextField
              name="title"
              control={control}
              label="Title"
              required
              disabled={!canManage}
            />
            <FormTextField
              name="description"
              control={control}
              label="Description"
              multiline
              minRows={3}
              disabled={!canManage}
            />
            <DateInput
              name="bidDeadline"
              control={control}
              label="Bid deadline"
              disabled={!canManage}
            />
          </FormSection>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!canManage || create.isPending}
            >
              Create draft
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
