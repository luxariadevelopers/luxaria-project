import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDate, formatInr } from '@/format';
import type { PublicCommitment } from './types';

type Props = {
  commitment: PublicCommitment;
};

/**
 * Commitments have no document-upload endpoints.
 * Surfaces agreement reference + recorded receipts as the document trail.
 */
export function CommitmentDocumentsPanel({ commitment }: Props) {
  const bank = commitment.expectedBankAccount;

  return (
    <Stack spacing={2} data-testid="commitment-documents-panel">
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Agreement & bank
        </Typography>
        <Typography variant="body2">
          Agreement reference:{' '}
          {commitment.agreementReference?.trim() || '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Expected account:{' '}
          {[
            bank.accountHolderName,
            bank.bankName,
            bank.ifsc,
            bank.accountNumberLast4
              ? `••••${bank.accountNumberLast4}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ') || '—'}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Receipts
        </Typography>
        {commitment.receipts.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No receipts recorded against this commitment.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Received</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {commitment.receipts.map((receipt, index) => (
                <TableRow key={`${receipt.receivedAt}-${index}`}>
                  <TableCell>{formatDate(receipt.receivedAt)}</TableCell>
                  <TableCell>{receipt.reference ?? '—'}</TableCell>
                  <TableCell>{receipt.remarks ?? '—'}</TableCell>
                  <TableCell align="right">
                    {formatInr(receipt.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
