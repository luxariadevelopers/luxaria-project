import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { periodDisplayLabel, periodTypeLabel } from './labels';
import { PeriodStatusChip } from './PeriodStatusChip';
import type { PublicAccountingPeriod } from './types';

type Props = {
  rows: PublicAccountingPeriod[];
  selectedId: string | null;
  onSelect: (period: PublicAccountingPeriod) => void;
};

export function PeriodTable({ rows, selectedId, onSelect }: Props) {
  return (
    <TableContainer component={Paper} variant="outlined" data-testid="period-table">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Period</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Range</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Validation</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const selected = row.id === selectedId;
            return (
              <TableRow
                key={row.id}
                hover
                selected={selected}
                onClick={() => onSelect(row)}
                sx={{ cursor: 'pointer' }}
                data-testid={`period-row-${row.id}`}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {periodDisplayLabel(row)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.periodNumber}
                  </Typography>
                </TableCell>
                <TableCell>{periodTypeLabel(row.periodType)}</TableCell>
                <TableCell>
                  {dayjs(row.periodFrom).format('DD MMM YYYY')}
                  {' – '}
                  {dayjs(row.periodTo).format('DD MMM YYYY')}
                </TableCell>
                <TableCell>
                  <PeriodStatusChip status={row.status} />
                </TableCell>
                <TableCell>
                  {row.validationPassed
                    ? 'Passed'
                    : row.validationRunAt
                      ? 'Failed / incomplete'
                      : 'Not run'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
