import { useEffect, useMemo } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage, isConflictError } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { paymentModeLabel } from './labels';
import { ContributionPaymentMode } from './types';
import { useCreateContributionReceipt } from './useContributionReceipts';
import { formDrawerPaperSx } from '@/components/forms';
import {
  contributionReceiptCreateSchema,
  isDuplicateTransactionReferenceMessage,
  type ContributionReceiptCreateFormValues,
} from './validation';

type Option = {
  id: string;
  label: string;
  pendingAmount?: number;
  participantId?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  participants: readonly Option[];
  /** Approved commitments with pending headroom. */
  commitments: readonly Option[];
  bankAccounts: readonly Option[];
  canViewBankAccounts: boolean;
};

const MODE_OPTIONS = Object.values(ContributionPaymentMode).map((value) => ({
  value,
  label: paymentModeLabel(value),
}));

export function CreateContributionReceiptDrawer({
  open,
  onClose,
  projectId,
  participants,
  commitments,
  bankAccounts,
  canViewBankAccounts,
}: Props) {
  const create = useCreateContributionReceipt(projectId);
  const { success, error: notifyError, warning } = useNotify();

  const { control, handleSubmit, reset, setValue } =
    useForm<ContributionReceiptCreateFormValues>({
      resolver: zodResolver(contributionReceiptCreateSchema),
      defaultValues: {
        participantId: '',
        commitmentId: '',
        receivedDate: new Date().toISOString().slice(0, 10),
        amount: 0.01,
        paymentMode: ContributionPaymentMode.BankTransfer,
        bankAccountId: '',
        transactionReference: '',
        remarks: '',
        pendingHeadroom: 0,
      },
    });

  const participantId = useWatch({ control, name: 'participantId' });
  const commitmentId = useWatch({ control, name: 'commitmentId' });
  const paymentMode = useWatch({ control, name: 'paymentMode' });

  const filteredCommitments = useMemo(() => {
    const scoped = participantId
      ? commitments.filter((c) => c.participantId === participantId)
      : commitments;
    return scoped.map((c) => ({
      value: c.id,
      label: `${c.label}${
        c.pendingAmount != null
          ? ` · open ${formatInr(c.pendingAmount)}`
          : ''
      }`,
    }));
  }, [commitments, participantId]);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (
      commitmentId &&
      participantId &&
      !commitments.some(
        (c) => c.id === commitmentId && c.participantId === participantId,
      )
    ) {
      setValue('commitmentId', '');
      setValue('pendingHeadroom', 0);
    }
  }, [participantId, commitmentId, commitments, setValue]);

  useEffect(() => {
    const selected = commitments.find((c) => c.id === commitmentId);
    setValue('pendingHeadroom', selected?.pendingAmount ?? 0);
  }, [commitmentId, commitments, setValue]);

  const onSubmit = async (values: ContributionReceiptCreateFormValues) => {
    try {
      await create.mutateAsync({
        input: {
          participantId: values.participantId,
          commitmentId: values.commitmentId,
          receivedDate: values.receivedDate,
          amount: values.amount,
          paymentMode: values.paymentMode,
          bankAccountId: values.bankAccountId || null,
          transactionReference: values.transactionReference || null,
          remarks: values.remarks || null,
        },
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : undefined,
      });
      success('Contribution receipt draft created');
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      if (
        isConflictError(err) ||
        isDuplicateTransactionReferenceMessage(message)
      ) {
        warning(
          'Duplicate transaction reference for this bank account. Nest blocked the create (409).',
        );
        return;
      }
      notifyError(message);
    }
  };

  const needsBank =
    paymentMode === ContributionPaymentMode.BankTransfer ||
    paymentMode === ContributionPaymentMode.Cheque;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(480) },
      }}
    >
      <Box sx={{ p: 2.5 }} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Typography variant="h6">New contribution receipt</Typography>
          <Typography variant="body2" color="text.secondary">
            Requires contribution_receipt.create. Allocate to one approved
            commitment. Amount cannot exceed open commitment headroom. Bank
            transfer / cheque require bank account + transaction reference
            (duplicate refs return 409).
          </Typography>

          <FormSelect
            name="participantId"
            control={control}
            label="Participant"
            options={participants.map((p) => ({
              value: p.id,
              label: p.label,
            }))}
          />

          <FormSelect
            name="commitmentId"
            control={control}
            label="Commitment allocation"
            options={filteredCommitments}
            disabled={!participantId}
          />

          <FormTextField
            name="amount"
            control={control}
            label="Amount"
            type="number"
            required
          />
          <FormTextField
            name="receivedDate"
            control={control}
            label="Received date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormSelect
            name="paymentMode"
            control={control}
            label="Payment mode"
            options={MODE_OPTIONS}
          />

          {needsBank ? (
            <>
              {canViewBankAccounts && bankAccounts.length > 0 ? (
                <FormSelect
                  name="bankAccountId"
                  control={control}
                  label="Receiving bank account"
                  options={bankAccounts.map((b) => ({
                    value: b.id,
                    label: b.label,
                  }))}
                />
              ) : (
                <FormTextField
                  name="bankAccountId"
                  control={control}
                  label="Bank account id"
                  helperText={
                    canViewBankAccounts
                      ? 'No company bank accounts found.'
                      : 'Requires bank.view to load accounts — paste account id.'
                  }
                />
              )}
              <FormTextField
                name="transactionReference"
                control={control}
                label="Transaction reference"
                required
              />
            </>
          ) : null}

          <FormTextField
            name="remarks"
            control={control}
            label="Remarks"
            multiline
            minRows={2}
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending || participants.length === 0}
            >
              {create.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
