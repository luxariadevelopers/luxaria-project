import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  BankAccountStatus,
  fetchCompanyBankAccounts,
} from '@/bank-accounts';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { postShareCapitalReceipt } from '@/directors/api';
import type { PublicShareholding } from '@/directors/types';
import { useDirectorsList } from '@/directors/useDirectors';
import { formatInr } from '@/format';
import { cashBankBookQueryKeys } from '@/reports/accounting/queryKeys';

type Props = {
  holdings: readonly PublicShareholding[];
};

/**
 * Posts company share capital (shares × face value per director) into the
 * bank book — e.g. 4 × ₹25,00,000 = ₹1,00,00,000.
 */
export function PostShareCapitalToBankPanel({ holdings }: Props) {
  const { hasPermission } = useAuth();
  const canPost = hasPermission('company.update');
  const { success, error: notifyError } = useNotify();
  const qc = useQueryClient();

  const [bankAccountId, setBankAccountId] = useState('');
  const [receivedDate, setReceivedDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const banksQuery = useQuery({
    queryKey: ['share-capital', 'banks'],
    queryFn: () =>
      fetchCompanyBankAccounts({
        page: 1,
        limit: 50,
        status: BankAccountStatus.Active,
      }),
    enabled: canPost,
    staleTime: 30_000,
    retry: false,
  });

  const directorsQuery = useDirectorsList(
    { page: 1, limit: 100 },
    canPost,
  );

  const directorNameById = useMemo(
    () =>
      new Map(
        (directorsQuery.data?.items ?? []).map((row) => [
          row.id,
          `${row.directorCode} — ${row.fullName}`,
        ]),
      ),
    [directorsQuery.data?.items],
  );

  const lines = useMemo(
    () =>
      holdings.map((row) => ({
        directorId: row.directorId,
        label:
          directorNameById.get(row.directorId) ??
          `Director …${row.directorId.slice(-6)}`,
        numberOfShares: row.numberOfShares,
        faceValue: row.faceValue,
        amount: row.numberOfShares * row.faceValue,
      })),
    [holdings, directorNameById],
  );

  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + line.amount, 0),
    [lines],
  );

  const bankOptions = banksQuery.data?.items ?? [];

  useEffect(() => {
    if (bankAccountId || bankOptions.length === 0) return;
    const preferred =
      bankOptions.find((bank) => bank.isDefault)?.id ?? bankOptions[0]?.id;
    if (preferred) setBankAccountId(preferred);
  }, [bankAccountId, bankOptions]);

  const mutation = useMutation({
    mutationFn: () =>
      postShareCapitalReceipt({
        bankAccountId,
        receivedDate,
        reference: reference.trim() || null,
      }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['shareholding'] });
      void qc.invalidateQueries({ queryKey: cashBankBookQueryKeys.all });
      success(
        `Posted ${formatInr(result.totalAmount)} share capital to bank book${
          result.journalNumber ? ` (${result.journalNumber})` : ''
        }. Paid-up capital is now ${formatInr(result.paidUpShareCapital)}.`,
      );
      setConfirmOpen(false);
    },
    onError: (err) => {
      notifyError(getErrorMessage(err));
      setConfirmOpen(false);
    },
  });

  if (holdings.length === 0) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="post-share-capital-to-bank"
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h6">Post share capital to bank book</Typography>
          <Typography variant="body2" color="text.secondary">
            Cap table alone does not move money. This posts each director&apos;s
            capital (<strong>shares × face value</strong>) into the selected
            company bank account — for example 2,50,000 × ₹10 = ₹25,00,000 per
            director, total ₹1,00,00,000 for four directors. That total then
            appears in the bank book as capital income, and paid-up capital is
            updated.
          </Typography>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Director</TableCell>
              <TableCell align="right">Shares</TableCell>
              <TableCell align="right">Face value</TableCell>
              <TableCell align="right">Capital</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.directorId}>
                <TableCell>{line.label}</TableCell>
                <TableCell align="right">
                  {line.numberOfShares.toLocaleString('en-IN')}
                </TableCell>
                <TableCell align="right">{formatInr(line.faceValue)}</TableCell>
                <TableCell align="right">{formatInr(line.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3}>
                <strong>Total capital income</strong>
              </TableCell>
              <TableCell align="right">
                <strong>{formatInr(totalAmount)}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {!canPost ? (
          <Alert severity="info">
            Requires company.update to post share capital into the bank book.
          </Alert>
        ) : (
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="share-capital-bank">Bank account</InputLabel>
              <Select
                labelId="share-capital-bank"
                label="Bank account"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
              >
                {bankOptions.map((bank) => (
                  <MenuItem key={bank.id} value={bank.id}>
                    {bank.bankName} · {bank.maskedAccountNumber}
                    {bank.isDefault ? ' (default)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Received date"
              type="date"
              size="small"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Reference (optional)"
              size="small"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Board resolution / receipt ref"
            />
            <Button
              variant="contained"
              disabled={!bankAccountId || totalAmount <= 0 || mutation.isPending}
              onClick={() => setConfirmOpen(true)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Post {formatInr(totalAmount)} to bank book
            </Button>
          </Stack>
        )}
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        title="Post share capital to bank book?"
        description={`This will debit the selected bank account and credit Director Account for each director (total ${formatInr(
          totalAmount,
        )}), update paid-up capital, and show the amount in the bank book. It can only be posted once.`}
        confirmLabel="Post to bank book"
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Paper>
  );
}
