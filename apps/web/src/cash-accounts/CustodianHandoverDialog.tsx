import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import type { CashBalanceView, PublicCashAccount } from './types';
import { CashAccountStatus } from './types';
import {
  useCancelHandover,
  useConfirmHandover,
  useTransferCustodian,
} from './useCashAccounts';
import {
  assertDeclaredBalanceInput,
  assertDifferentCustodian,
  confirmHandoverSchema,
  custodianTransferSchema,
  type ConfirmHandoverFormValues,
  type CustodianTransferFormValues,
} from './validation';

type Option = { id: string; label: string };

type Mode = 'transfer' | 'confirm' | 'cancel';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  account: PublicCashAccount | null;
  balance?: CashBalanceView | null;
  users: readonly Option[];
  canViewUsers: boolean;
  currentUserId?: string | null;
  custodianLabel: (userId: string) => string;
};

export function CustodianHandoverDialog({
  open,
  onClose,
  mode,
  account,
  balance,
  users,
  canViewUsers,
  currentUserId,
  custodianLabel,
}: Props) {
  const transfer = useTransferCustodian();
  const confirm = useConfirmHandover();
  const cancel = useCancelHandover();
  const { success, error: notifyError } = useNotify();

  const transferForm = useForm<CustodianTransferFormValues>({
    resolver: zodResolver(custodianTransferSchema),
    defaultValues: { toUserId: '', declaredBalance: '', notes: '' },
  });

  const confirmForm = useForm<ConfirmHandoverFormValues>({
    resolver: zodResolver(confirmHandoverSchema),
    defaultValues: { notes: '' },
  });

  useEffect(() => {
    if (!open) {
      transferForm.reset({
        toUserId: '',
        declaredBalance: '',
        notes: '',
      });
      confirmForm.reset({ notes: '' });
    }
  }, [open, transferForm, confirmForm]);

  const pending = transfer.isPending || confirm.isPending || cancel.isPending;
  const handover = account?.pendingHandover ?? null;

  const onTransfer = async (values: CustodianTransferFormValues) => {
    if (!account) return;
    const check = assertDifferentCustodian(
      account.custodianUserId,
      values.toUserId,
    );
    if (!check.ok) {
      notifyError(check.message);
      return;
    }
    const declared = assertDeclaredBalanceInput(values.declaredBalance);
    if (!declared.ok) {
      notifyError(declared.message);
      return;
    }
    try {
      await transfer.mutateAsync({
        id: account.id,
        input: {
          toUserId: values.toUserId,
          declaredBalance: declared.value,
          notes: values.notes?.trim() || undefined,
        },
      });
      success('Custodian handover started');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onConfirm = async (values: ConfirmHandoverFormValues) => {
    if (!account) return;
    try {
      await confirm.mutateAsync({
        id: account.id,
        input: { notes: values.notes?.trim() || undefined },
      });
      success('Handover confirmation recorded');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onCancel = async () => {
    if (!account) return;
    try {
      await cancel.mutateAsync(account.id);
      success('Pending handover cancelled');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const userOptions = users
    .filter((u) => u.id !== account?.custodianUserId)
    .map((u) => ({ value: u.id, label: u.label }));

  const title =
    mode === 'transfer'
      ? `Transfer custodian — ${account?.accountCode ?? ''}`
      : mode === 'confirm'
        ? `Confirm handover — ${account?.accountCode ?? ''}`
        : `Cancel handover — ${account?.accountCode ?? ''}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="custodian-handover-dialog"
    >
      <DialogTitle>{title}</DialogTitle>

      {mode === 'transfer' ? (
        <form onSubmit={transferForm.handleSubmit(onTransfer)}>
          <DialogContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Current custodian:{' '}
                {account
                  ? custodianLabel(account.custodianUserId)
                  : '—'}
                . Both outgoing and incoming custodians must confirm
                (`cash.manage` to start; `cash.view` to confirm).
              </Typography>
              {balance ? (
                <Alert severity="info" variant="outlined">
                  System balance {formatInr(balance.currentBalance)}. Declared
                  cash count should be within ₹1 of this amount.
                </Alert>
              ) : null}
              {canViewUsers && userOptions.length > 0 ? (
                <FormSelect
                  name="toUserId"
                  control={transferForm.control}
                  label="Incoming custodian"
                  options={userOptions}
                  required
                />
              ) : (
                <FormTextField
                  name="toUserId"
                  control={transferForm.control}
                  label="Incoming custodian user id"
                  required
                />
              )}
              <FormTextField
                name="declaredBalance"
                control={transferForm.control}
                label="Declared balance (optional)"
                type="number"
              />
              <FormTextField
                name="notes"
                control={transferForm.control}
                label="Notes"
                multiline
                minRows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={pending}>
              Back
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {transfer.isPending ? 'Starting…' : 'Start handover'}
            </Button>
          </DialogActions>
        </form>
      ) : null}

      {mode === 'confirm' ? (
        <form onSubmit={confirmForm.handleSubmit(onConfirm)}>
          <DialogContent>
            <Stack spacing={2}>
              {handover &&
              account?.status === CashAccountStatus.PendingHandover ? (
                <Alert severity="warning" variant="outlined">
                  From {custodianLabel(handover.fromUserId)} →{' '}
                  {custodianLabel(handover.toUserId)}.
                  {handover.awaitingOutgoingConfirmation
                    ? ' Awaiting outgoing confirmation.'
                    : ''}
                  {handover.awaitingIncomingConfirmation
                    ? ' Awaiting incoming confirmation.'
                    : ''}
                  {handover.declaredBalance != null
                    ? ` Declared ${formatInr(handover.declaredBalance)}.`
                    : ''}
                </Alert>
              ) : null}
              {currentUserId &&
              handover &&
              currentUserId !== handover.fromUserId &&
              currentUserId !== handover.toUserId ? (
                <Alert severity="error" variant="outlined">
                  Only the outgoing or incoming custodian can confirm (Nest
                  returns 403).
                </Alert>
              ) : null}
              <FormTextField
                name="notes"
                control={confirmForm.control}
                label="Notes (optional)"
                multiline
                minRows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={pending}>
              Back
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {confirm.isPending ? 'Confirming…' : 'Confirm'}
            </Button>
          </DialogActions>
        </form>
      ) : null}

      {mode === 'cancel' ? (
        <>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Cancel the pending custodian handover for{' '}
              {account?.accountCode}. Requires `cash.manage`.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={pending}>
              Back
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={() => void onCancel()}
              disabled={pending}
            >
              {cancel.isPending ? 'Cancelling…' : 'Cancel handover'}
            </Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
  );
}
