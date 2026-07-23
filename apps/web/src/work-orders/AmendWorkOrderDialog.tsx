import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useFieldArray, useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { BoqUnit } from '@/boq/types';
import { DateInput } from '@/components/forms/DateInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { AMENDMENT_TYPE_OPTIONS } from './labels';
import type { PublicWorkOrder } from './types';
import { useCreateWorkOrderAmendment } from './useWorkOrders';
import {
  defaultAmendFormValues,
  formValuesToAmendmentInput,
  amendWorkOrderSchema,
  type AmendWorkOrderFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  workOrder: PublicWorkOrder | null;
  onCreated?: () => void;
};

const UNIT_OPTIONS = Object.values(BoqUnit).map((value) => ({
  value,
  label: value.replace(/_/g, ' '),
}));

export function AmendWorkOrderDialog({
  open,
  onClose,
  workOrder,
  onCreated,
}: Props) {
  const create = useCreateWorkOrderAmendment();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset, watch } =
    useForm<AmendWorkOrderFormValues>({
      resolver: zodResolver(amendWorkOrderSchema),
      defaultValues: workOrder
        ? defaultAmendFormValues(workOrder)
        : undefined,
    });
  const boqFields = useFieldArray({ control, name: 'boqScopeLines' });
  const type = watch('type');

  useEffect(() => {
    if (open && workOrder) {
      reset(defaultAmendFormValues(workOrder));
    }
  }, [open, reset, workOrder]);

  const showBoq =
    type === 'quantity' ||
    type === 'rate' ||
    type === 'scope' ||
    type === 'mixed';
  const showDates = type === 'time_extension' || type === 'mixed';
  const showValue = type === 'revised_value' || type === 'mixed';

  const onSubmit = async (values: AmendWorkOrderFormValues) => {
    if (!workOrder) return;
    try {
      await create.mutateAsync({
        workOrderId: workOrder.id,
        input: formValuesToAmendmentInput(values),
      });
      success('Amendment submitted for approval (active commercial unchanged)');
      onCreated?.();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  if (!workOrder) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      data-testid="amend-work-order-dialog"
    >
      <DialogTitle>Amend work order</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {workOrder.workOrderNumber} · active r{workOrder.activeRevision}
          </Typography>
          <Alert severity="info" variant="outlined">
            Creates a pending amendment. Approved commercial snapshots are never
            overwritten until the amendment is approved.
          </Alert>
          <FormSelect
            name="type"
            control={control}
            label="Amendment type"
            options={AMENDMENT_TYPE_OPTIONS}
          />
          <FormTextField
            name="reason"
            control={control}
            label="Reason"
            multiline
            minRows={2}
          />
          {showValue ? (
            <FormTextField
              name="revisedValue"
              control={control}
              label="Revised contract value"
              type="number"
            />
          ) : null}
          {showDates ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <DateInput name="startDate" control={control} label="Start date" />
              <DateInput name="endDate" control={control} label="End date" />
            </Stack>
          ) : null}
          {showBoq ? (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Proposed BOQ lines</Typography>
              {boqFields.fields.map((field, index) => (
                <Stack
                  key={field.id}
                  spacing={1}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between' }}
                  >
                    <Typography variant="caption">Line {index + 1}</Typography>
                    {boqFields.fields.length > 1 ? (
                      <IconButton
                        size="small"
                        onClick={() => boqFields.remove(index)}
                        aria-label="Remove line"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Stack>
                  <FormTextField
                    name={`boqScopeLines.${index}.description`}
                    control={control}
                    label="Description"
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <FormSelect
                      name={`boqScopeLines.${index}.unit`}
                      control={control}
                      label="Unit"
                      options={UNIT_OPTIONS}
                    />
                    <FormTextField
                      name={`boqScopeLines.${index}.quantity`}
                      control={control}
                      label="Qty"
                      type="number"
                    />
                    <FormTextField
                      name={`boqScopeLines.${index}.rate`}
                      control={control}
                      label="Rate"
                      type="number"
                    />
                  </Stack>
                </Stack>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() =>
                  boqFields.append({
                    boqItemId: null,
                    boqCode: '',
                    description: '',
                    unit: BoqUnit.Number,
                    quantity: 0,
                    rate: 0,
                  })
                }
              >
                Add line
              </Button>
            </Stack>
          ) : null}
          <FormTextField
            name="terms"
            control={control}
            label="Terms (optional)"
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={create.isPending}
        >
          Submit amendment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
