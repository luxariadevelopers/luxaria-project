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
import type { CalculationLine } from './validation';
import { sumCurrentCertifiedValue } from './validation';

type Props = {
  lines: readonly CalculationLine[];
};

export function CalculationGrid({ lines }: Props) {
  const gross = sumCurrentCertifiedValue(lines);
  const hasBoqBreach = lines.some((line) => line.exceedsBoq);

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="calculation-grid">
      <Typography variant="subtitle2" gutterBottom>
        Calculation grid
      </Typography>
      {hasBoqBreach ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          One or more lines exceed BOQ planned quantity. Nest will reject if
          cumulative certified quantity is over the active BOQ.
        </Alert>
      ) : null}
      {lines.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Select verified measurements to preview claim amounts.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>WM</TableCell>
              <TableCell>BOQ</TableCell>
              <TableCell align="right">Prev</TableCell>
              <TableCell align="right">Current</TableCell>
              <TableCell align="right">Cumul</TableCell>
              <TableCell align="right">BOQ plan</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow
                key={line.measurementId}
                data-testid={`calc-line-${line.measurementId}`}
              >
                <TableCell>{line.measurementNumber}</TableCell>
                <TableCell>
                  {line.boqCode ?? line.boqItemId.slice(-6)}
                </TableCell>
                <TableCell align="right">
                  {formatQuantity(line.previousQuantity)}
                </TableCell>
                <TableCell align="right">
                  {formatQuantity(line.currentQuantity)} {line.unit}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ color: line.exceedsBoq ? 'error.main' : undefined }}
                >
                  {formatQuantity(line.cumulativeQuantity)}
                </TableCell>
                <TableCell align="right">
                  {formatQuantity(line.boqPlannedQuantity)}
                </TableCell>
                <TableCell align="right">{formatInr(line.rate)}</TableCell>
                <TableCell align="right">{formatInr(line.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={7} align="right">
                <Typography variant="subtitle2">Current certified</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" data-testid="calc-gross">
                  {formatInr(gross)}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
