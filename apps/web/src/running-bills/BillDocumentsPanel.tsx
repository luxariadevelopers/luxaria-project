import { Link, Paper, Stack, Typography } from '@mui/material';
import type { PublicContractorBill } from './types';

type Props = {
  bill: PublicContractorBill;
};

export function BillDocumentsPanel({ bill }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="bill-documents-panel">
      <Typography variant="subtitle2" gutterBottom>
        Documents
      </Typography>
      <Stack spacing={1}>
        {bill.invoiceDocument ? (
          <Typography variant="body2">
            Invoice document:{' '}
            <Link
              href={`/documents?id=${encodeURIComponent(bill.invoiceDocument)}`}
              underline="hover"
            >
              {bill.invoiceDocument}
            </Link>
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No invoice document attached. Required before submit-claim.
          </Typography>
        )}
        {bill.notes ? (
          <Typography variant="body2" color="text.secondary">
            Notes: {bill.notes}
          </Typography>
        ) : null}
        {bill.rejectionReason ? (
          <Typography variant="body2" color="error">
            Rejection reason: {bill.rejectionReason}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}
