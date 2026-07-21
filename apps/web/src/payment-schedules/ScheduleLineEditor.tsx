import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import type { PaymentScheduleLineInput } from './types';

type Props = {
  lines: PaymentScheduleLineInput[];
  onChange: (lines: PaymentScheduleLineInput[]) => void;
  requireDueDate?: boolean;
  disabled?: boolean;
};

function emptyLine(sequence: number): PaymentScheduleLineInput {
  return {
    sequence,
    milestone: '',
    dueDate: null,
    percentage: 0,
    amount: 0,
    tax: 0,
  };
}

export function ScheduleLineEditor({
  lines,
  onChange,
  requireDueDate = false,
  disabled,
}: Props) {
  const updateLine = (
    index: number,
    patch: Partial<PaymentScheduleLineInput>,
  ) => {
    onChange(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (index: number) => {
    const next = lines
      .filter((_, i) => i !== index)
      .map((line, i) => ({ ...line, sequence: i + 1 }));
    onChange(next);
  };

  const addLine = () => {
    onChange([...lines, emptyLine(lines.length + 1)]);
  };

  return (
    <Stack spacing={1}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Milestone</TableCell>
            <TableCell>Due date</TableCell>
            <TableCell align="right">%</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Tax</TableCell>
            <TableCell width={48} />
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={line.sequence}>
              <TableCell>{line.sequence}</TableCell>
              <TableCell>
                <TextField
                  size="small"
                  fullWidth
                  value={line.milestone}
                  disabled={disabled}
                  onChange={(e) =>
                    updateLine(index, { milestone: e.target.value })
                  }
                />
              </TableCell>
              <TableCell>
                <TextField
                  size="small"
                  type="date"
                  fullWidth
                  value={line.dueDate?.slice(0, 10) ?? ''}
                  disabled={disabled}
                  required={requireDueDate}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) =>
                    updateLine(index, {
                      dueDate: e.target.value || null,
                    })
                  }
                />
              </TableCell>
              <TableCell align="right">
                <TextField
                  size="small"
                  type="number"
                  value={line.percentage}
                  disabled={disabled}
                  slotProps={{
                    htmlInput: { min: 0, max: 100, step: 0.01 },
                  }}
                  onChange={(e) =>
                    updateLine(index, {
                      percentage: Number(e.target.value),
                    })
                  }
                  sx={{ width: 90 }}
                />
              </TableCell>
              <TableCell align="right">
                <TextField
                  size="small"
                  type="number"
                  value={line.amount}
                  disabled={disabled}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  onChange={(e) =>
                    updateLine(index, { amount: Number(e.target.value) })
                  }
                  sx={{ width: 120 }}
                />
              </TableCell>
              <TableCell align="right">
                <TextField
                  size="small"
                  type="number"
                  value={line.tax ?? 0}
                  disabled={disabled}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  onChange={(e) =>
                    updateLine(index, { tax: Number(e.target.value) })
                  }
                  sx={{ width: 100 }}
                />
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  color="error"
                  disabled={disabled || lines.length <= 1}
                  onClick={() => removeLine(index)}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button size="small" onClick={addLine} disabled={disabled}>
        Add line
      </Button>
    </Stack>
  );
}

export function linesFromBookingInstallments(
  installments: Array<{
    sequence: number;
    label: string;
    dueDate: string | null;
    amount: number;
    percent: number | null;
  }>,
): PaymentScheduleLineInput[] {
  return installments.map((item, index) => ({
    sequence: item.sequence ?? index + 1,
    milestone: item.label,
    dueDate: item.dueDate?.slice(0, 10) ?? null,
    percentage: item.percent ?? 0,
    amount: item.amount,
    tax: 0,
  }));
}
