import {
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { checklistItemStatusLabel } from './labels';
import { PeriodChecklistItemStatus, type PeriodChecklistItem } from './types';

type Props = {
  items: PeriodChecklistItem[];
  validationRunAt: string | null;
  validationPassed: boolean;
};

function statusColor(status: string): 'default' | 'success' | 'error' | 'warning' {
  if (status === PeriodChecklistItemStatus.Passed) return 'success';
  if (status === PeriodChecklistItemStatus.Failed) return 'error';
  if (status === PeriodChecklistItemStatus.Pending) return 'warning';
  return 'default';
}

export function ClosingChecklist({
  items,
  validationRunAt,
  validationPassed,
}: Props) {
  return (
    <Stack spacing={1.5} data-testid="closing-checklist">
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h6">Closing checklist</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Chip
            size="small"
            color={validationPassed ? 'success' : 'warning'}
            label={validationPassed ? 'Ready to lock' : 'Not ready'}
          />
          <Typography variant="caption" color="text.secondary">
            {validationRunAt
              ? `Last run ${dayjs(validationRunAt).format('DD MMM YYYY HH:mm')}`
              : 'Validation not run'}
          </Typography>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Check</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Issues</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.key} data-testid={`checklist-row-${item.key}`}>
                <TableCell>{item.label}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={statusColor(item.status)}
                    variant="outlined"
                    label={checklistItemStatusLabel(item.status)}
                  />
                </TableCell>
                <TableCell align="right">{item.issueCount}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">
                    No checklist items yet. Run pre-close validation.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
