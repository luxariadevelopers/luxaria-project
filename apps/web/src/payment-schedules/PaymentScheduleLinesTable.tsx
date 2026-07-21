import {
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  formatDate,
  formatInr,
} from './labels';
import { PaymentScheduleLineStatusChip } from './PaymentScheduleLineStatusChip';
import type { PaymentScheduleCapabilities } from './roleAccess';
import type { PublicPaymentSchedule, PublicPaymentScheduleLine } from './types';
import {
  canGenerateLineDemand,
  canMarkLineDue,
} from './workflowActions';

type Props = {
  schedule: PublicPaymentSchedule;
  caps: PaymentScheduleCapabilities;
  onMarkDue?: (line: PublicPaymentScheduleLine) => void;
  onGenerateDemand?: (line: PublicPaymentScheduleLine) => void;
  actionPending?: boolean;
};

export function PaymentScheduleLinesTable({
  schedule,
  caps,
  onMarkDue,
  onGenerateDemand,
  actionPending,
}: Props) {
  const lines = [...schedule.lines].sort((a, b) => a.sequence - b.sequence);

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }} data-testid="schedule-lines-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Milestone</TableCell>
            <TableCell>Due</TableCell>
            <TableCell align="right">%</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Tax</TableCell>
            <TableCell align="right">Collected</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Demand</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>{line.sequence}</TableCell>
              <TableCell>{line.milestone}</TableCell>
              <TableCell>{formatDate(line.dueDate)}</TableCell>
              <TableCell align="right">{line.percentage}</TableCell>
              <TableCell align="right">{formatInr(line.amount)}</TableCell>
              <TableCell align="right">{formatInr(line.tax)}</TableCell>
              <TableCell align="right">{formatInr(line.collectedAmount)}</TableCell>
              <TableCell>
                <PaymentScheduleLineStatusChip status={line.status} />
              </TableCell>
              <TableCell>
                {line.demandId ? `…${line.demandId.slice(-6)}` : '—'}
              </TableCell>
              <TableCell align="right">
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ justifyContent: 'flex-end' }}
                >
                  {onMarkDue && canMarkLineDue(schedule, line, caps) ? (
                    <Button
                      size="small"
                      disabled={actionPending}
                      onClick={() => onMarkDue(line)}
                    >
                      Mark due
                    </Button>
                  ) : null}
                  {onGenerateDemand &&
                  canGenerateLineDemand(schedule, line, caps) ? (
                    <Button
                      size="small"
                      disabled={actionPending}
                      onClick={() => onGenerateDemand(line)}
                    >
                      Demand
                    </Button>
                  ) : null}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {!lines.length ? (
            <TableRow>
              <TableCell colSpan={10}>
                <Typography color="text.secondary" variant="body2">
                  No schedule lines.
                </Typography>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Paper>
  );
}
