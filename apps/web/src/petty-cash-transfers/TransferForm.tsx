import { useEffect, useMemo } from 'react';
import { Alert, Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage, isConflictError } from '@/api/errors';
import { formDrawerPaperSx } from '@/components/forms';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { ApprovedBalanceDisplay } from './ApprovedBalanceDisplay';
import type {
  FundablePettyCashRequirement,
  PublicPettyCashFundTransfer,
} from './types';
import {
  useApprovedRequestBalance,
  useCreatePettyCashFundTransfer,
} from './usePettyCashTransfers';
import {
  findDuplicateTransactionReference,
  isDuplicateTransactionReferenceMessage,
  transferCreateSchema,
  type TransferCreateFormValues,
} from './validation';

type Option = {
  id: string;
  label: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  requests: readonly FundablePettyCashRequirement[];
  bankAccounts: readonly Option[];
  canViewBankAccounts: boolean;
  /** Existing transfers used for soft duplicate txn-ref detection. */
  existingTransfers: readonly PublicPettyCashFundTransfer[];
  onCreated?: (transfer: PublicPettyCashFundTransfer) => void;
};

export function TransferForm({
  open,
  onClose,
  projectId,
  requests,
  bankAccounts,
  canViewBankAccounts,
  existingTransfers,
  onCreated,
}: Props) {
  const create = useCreatePettyCashFundTransfer(projectId);
  const { success, error: notifyError, warning } = useNotify();

  const { control, handleSubmit, reset, setValue } =
    useForm<TransferCreateFormValues>({
      resolver: zodResolver(transferCreateSchema),
      defaultValues: {
        requestId: '',
        sourceBankAccountId: '',
        destinationPettyCashAccountId: '',
        transferDate: new Date().toISOString().slice(0, 10),
        amount: 0.01,
        transactionReference: '',
        paymentProof: '',
        remainingApprovedBalance: 0,
      },
    });

  const requestId = useWatch({ control, name: 'requestId' });
  const balance = useApprovedRequestBalance(requestId || null, open);

  const requestOptions = useMemo(
    () =>
      requests.map((r) => ({
        value: r.id,
        label: `${r.requestNumber} · ${r.status}${
          r.approvedAmount != null
            ? ` · approved ${formatInr(r.approvedAmount)}`
            : ''
        }`,
      })),
    [requests],
  );

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    const selected = requests.find((r) => r.id === requestId);
    setValue(
      'destinationPettyCashAccountId',
      selected?.pettyCashAccountId ?? '',
    );
  }, [requestId, requests, setValue]);

  useEffect(() => {
    setValue(
      'remainingApprovedBalance',
      balance.data?.remainingApprovedBalance ?? 0,
    );
  }, [balance.data?.remainingApprovedBalance, setValue]);

  const onSubmit = async (values: TransferCreateFormValues) => {
    const dup = findDuplicateTransactionReference(
      existingTransfers,
      values.sourceBankAccountId,
      values.transactionReference,
    );
    if (dup) {
      warning(
        `Duplicate transaction reference — already used on ${dup.transferNumber}.`,
      );
      return;
    }

    try {
      const created = await create.mutateAsync({
        input: {
          projectId,
          requestId: values.requestId,
          sourceBankAccountId: values.sourceBankAccountId,
          destinationPettyCashAccountId: values.destinationPettyCashAccountId,
          transferDate: values.transferDate,
          amount: values.amount,
          transactionReference: values.transactionReference.trim(),
          paymentProof: values.paymentProof?.trim() || null,
        },
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : undefined,
      });
      success('Fund transfer draft created');
      onCreated?.(created);
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      if (
        isConflictError(err) ||
        isDuplicateTransactionReferenceMessage(message)
      ) {
        warning(
          'Duplicate reference blocked (idempotency key or conflict). Nest returned 409.',
        );
        return;
      }
      notifyError(message);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(520) },
      }}
    >
      <Box
        sx={{ p: 2.5 }}
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        data-testid="petty-cash-transfer-form"
      >
        <Stack spacing={2}>
          <Typography variant="h6">Record fund transfer</Typography>
          <Typography variant="body2" color="text.secondary">
            Requires petty_cash.fund. Amount cannot exceed the approved
            remainder. Transaction reference is required. Attach payment proof
            before verify (document id or path).
          </Typography>

          <FormSelect
            name="requestId"
            control={control}
            label="Approved request"
            options={requestOptions}
          />

          <ApprovedBalanceDisplay
            balance={balance.data}
            loading={balance.isLoading || balance.isFetching}
            error={balance.error}
          />

          <FormTextField
            name="destinationPettyCashAccountId"
            control={control}
            label="Destination petty-cash account"
            required
            disabled
            helperText="Must match the requirement petty-cash account (Nest enforced)."
          />

          {canViewBankAccounts ? (
            <FormSelect
              name="sourceBankAccountId"
              control={control}
              label="Source bank account"
              options={bankAccounts.map((b) => ({
                value: b.id,
                label: b.label,
              }))}
            />
          ) : (
            <Alert severity="info">
              Source bank selector needs bank.view. Enter the account id
              manually if you already know it.
            </Alert>
          )}

          {!canViewBankAccounts ? (
            <FormTextField
              name="sourceBankAccountId"
              control={control}
              label="Source bank account id"
              required
            />
          ) : null}

          <FormTextField
            name="amount"
            control={control}
            label="Amount"
            type="number"
            required
          />
          <FormTextField
            name="transferDate"
            control={control}
            label="Transfer date"
            type="date"
            required
          />
          <FormTextField
            name="transactionReference"
            control={control}
            label="Transaction reference"
            required
            helperText="Required before verify. Duplicate refs for the same bank are blocked in the UI."
          />
          <FormTextField
            name="paymentProof"
            control={control}
            label="Payment proof (path or document id)"
            helperText="Optional on create — upload via Payment proof action before verify."
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
              disabled={
                create.isPending ||
                (Boolean(requestId) &&
                  (balance.data?.remainingApprovedBalance ?? 0) <= 0)
              }
            >
              {create.isPending ? 'Saving…' : 'Create draft'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
