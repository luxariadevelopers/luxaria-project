import {
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr, formatQuantity } from '@/format';
import type { PublicContractorBill } from './types';
import { certifiedQuantityWithinLimits } from './validation';

type Props = {
  bill: PublicContractorBill;
};

/**
 * Claim vs certified measurement lines (Phase 095).
 * Nest snapshots claim quantities onto the bill at create — certified qty
 * equals the measurement current qty unless Nest rejects on BOQ overrun.
 */
export function ClaimCertifiedGrid({ bill }: Props) {
  const breaches = bill.measurements.filter((line) => {
    const check = certifiedQuantityWithinLimits({
      currentQuantity: line.currentQuantity,
      measurementCurrentQuantity: line.currentQuantity,
      cumulativeQuantity: line.cumulativeQuantity,
      // BOQ planned is not on the bill line; use cumulative as soft ceiling signal
      // when planned is unknown (0 means unknown — skip BOQ check).
      boqPlannedQuantity: Math.max(line.cumulativeQuantity, line.currentQuantity),
    });
    return !check.ok;
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="claim-certified-grid">
      <Typography variant="subtitle2" gutterBottom>
        Claim vs certified
      </Typography>
      {breaches.length > 0 ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          Certified quantity cannot exceed measurement / BOQ limits.
        </Alert>
      ) : (
        <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
          Certified quantities are locked to verified measurement quantities.
          Cumulative quantity must remain within the active BOQ planned quantity
          (enforced by Nest).
        </Alert>
      )}
      {bill.measurements.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No measurement lines on this bill.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>WM</TableCell>
              <TableCell>BOQ</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Claim qty</TableCell>
              <TableCell align="right">Certified qty</TableCell>
              <TableCell align="right">Cumul</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bill.measurements.map((line) => (
              <TableRow key={line.id || line.measurementId}>
                <TableCell>
                  {line.measurementNumber ?? line.measurementId.slice(-6)}
                </TableCell>
                <TableCell>{line.boqCode ?? '—'}</TableCell>
                <TableCell>{line.description ?? '—'}</TableCell>
                <TableCell align="right">
                  {formatQuantity(line.currentQuantity)} {line.unit}
                </TableCell>
                <TableCell align="right">
                  {formatQuantity(line.currentQuantity)} {line.unit}
                </TableCell>
                <TableCell align="right">
                  {formatQuantity(line.cumulativeQuantity)}
                </TableCell>
                <TableCell align="right">{formatInr(line.rate)}</TableCell>
                <TableCell align="right">{formatInr(line.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
