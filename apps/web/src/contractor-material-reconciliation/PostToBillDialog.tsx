import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { FormSelect } from '@/components/forms/FormSelect';
import { formatBillingPeriod, raNumberLabel } from '@/running-bills/labels';
import { ContractorBillStatus } from '@/running-bills/types';
import { useRunningBillsList } from '@/running-bills/useRunningBills';
import type { PublicMaterialReconciliation } from './api';
import { postToBillSchema, type PostToBillFormValues } from './validation';

const EDITABLE_BILL_STATUSES = new Set<string>([
  ContractorBillStatus.Draft,
  ContractorBillStatus.Rejected,
]);

type Props = {
  open: boolean;
  onClose: () => void;
  row: PublicMaterialReconciliation | null;
  canViewBills: boolean;
  loading?: boolean;
  onConfirm: (billId: string) => void;
};

/**
 * Nest `POST /contractor-material-reconciliations/:id/post-to-bill`
 * (`contractor_recovery.manage`). Bill picker uses `GET /contractor-bills`
 * (`running_bill.view`). Nest only updates draft/rejected bills for recovery.
 */
export function PostToBillDialog({
  open,
  onClose,
  row,
  canViewBills,
  loading,
  onConfirm,
}: Props) {
  const { control, handleSubmit, reset } = useForm<PostToBillFormValues>({
    resolver: zodResolver(postToBillSchema),
    defaultValues: { billId: '' },
  });

  const billsQuery = useRunningBillsList(
    {
      projectId: row?.projectId,
      contractorId: row?.contractorId,
      limit: 50,
    },
    open && canViewBills && Boolean(row?.projectId && row?.contractorId),
  );

  const options = useMemo(() => {
    return (billsQuery.data?.items ?? [])
      .filter((bill) => EDITABLE_BILL_STATUSES.has(bill.status))
      .map((bill) => ({
        value: bill.id,
        label: [
          bill.billNumber,
          raNumberLabel(bill.raNumber),
          formatBillingPeriod(
            bill.billingPeriod.from,
            bill.billingPeriod.to,
          ),
          bill.status,
        ]
          .filter(Boolean)
          .join(' · '),
      }));
  }, [billsQuery.data?.items]);

  useEffect(() => {
    if (!open) return;
    reset({ billId: options[0]?.value ?? '' });
  }, [open, options, reset]);

  const submit = handleSubmit((values) => {
    onConfirm(values.billId);
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Post reconciliation to bill</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="post-to-bill-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Nest `POST …/post-to-bill` (`contractor_recovery.manage`). Adds
            recovery amount to the bill&apos;s material recovery. Only draft /
            rejected bills for this contractor can receive the update.
          </Typography>
          {!canViewBills ? (
            <Typography variant="body2" color="warning.main">
              Missing `running_bill.view` — bill list unavailable.
            </Typography>
          ) : billsQuery.isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading bills…
            </Typography>
          ) : billsQuery.isError ? (
            <Typography variant="body2" color="error.main">
              Failed to load running bills.
            </Typography>
          ) : options.length === 0 ? (
            <Typography variant="body2" color="warning.main">
              No draft or rejected running bills for this contractor.
            </Typography>
          ) : (
            <FormSelect
              name="billId"
              control={control}
              label="Running bill"
              options={options}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="post-to-bill-form"
          variant="contained"
          disabled={
            loading || !canViewBills || options.length === 0 || billsQuery.isLoading
          }
        >
          Post to bill
        </Button>
      </DialogActions>
    </Dialog>
  );
}
