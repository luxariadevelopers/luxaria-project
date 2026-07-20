import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDate, formatInr } from '@/format';
import type { PaymentScheduleLine } from './types';

type Props = {
  lines: readonly PaymentScheduleLine[];
};

export function PaymentScheduleTable({ lines }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="payment-schedule-table">
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Payment schedule
      </Typography>
      {lines.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No schedule lines on this commitment.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Due date</TableCell>
              <TableCell>Label</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow key={`${line.dueDate}-${index}`}>
                <TableCell>{formatDate(line.dueDate)}</TableCell>
                <TableCell>{line.label?.trim() || '—'}</TableCell>
                <TableCell align="right">{formatInr(line.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
