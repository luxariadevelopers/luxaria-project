import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDate, formatInr } from '@/format';
import {
  boqVersionTypeLabel,
  formatBoqVersionLabel,
} from './labels';
import type { BoqCapabilities } from './roleAccess';
import type { PublicBoqVersion } from './types';
import { VersionStatusChip } from './VersionStatusChip';
import {
  resolveBoqVersionActions,
  type BoqVersionActionId,
} from './workflowActions';

type Props = {
  versions: readonly PublicBoqVersion[];
  caps: BoqCapabilities;
  onAction: (action: BoqVersionActionId, version: PublicBoqVersion) => void;
  compareFromId?: string;
  compareToId?: string;
  onSelectCompare: (slot: 'from' | 'to', id: string) => void;
};

export function VersionTable({
  versions,
  caps,
  onAction,
  compareFromId,
  compareToId,
  onSelectCompare,
}: Props) {
  if (versions.length === 0) {
    return (
      <Typography color="text.secondary" data-testid="boq-versions-empty">
        No BOQ versions yet. Create an Original to start.
      </Typography>
    );
  }

  return (
    <Table size="small" data-testid="boq-version-table">
      <TableHead>
        <TableRow>
          <TableCell>Version</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Effective</TableCell>
          <TableCell align="right">Planned value</TableCell>
          <TableCell align="right">Cost impact</TableCell>
          <TableCell>Approval ref</TableCell>
          <TableCell>Compare</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {versions.map((row) => {
          const actions = resolveBoqVersionActions(row, caps).filter(
            (a) => a !== 'compare',
          );
          return (
            <TableRow key={row.id} hover>
              <TableCell>{formatBoqVersionLabel(row)}</TableCell>
              <TableCell>{boqVersionTypeLabel(row.versionType)}</TableCell>
              <TableCell>
                <VersionStatusChip status={row.status} />
              </TableCell>
              <TableCell>{formatDate(row.effectiveDate)}</TableCell>
              <TableCell align="right">
                {formatInr(row.totalPlannedValue)}
              </TableCell>
              <TableCell align="right">{formatInr(row.costImpact)}</TableCell>
              <TableCell>{row.approvalReference ?? '—'}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5}>
                  <Button
                    size="small"
                    variant={
                      compareFromId === row.id ? 'contained' : 'outlined'
                    }
                    onClick={() => onSelectCompare('from', row.id)}
                  >
                    From
                  </Button>
                  <Button
                    size="small"
                    variant={
                      compareToId === row.id ? 'contained' : 'outlined'
                    }
                    onClick={() => onSelectCompare('to', row.id)}
                  >
                    To
                  </Button>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}
                >
                  {actions.map((action) => (
                    <Button
                      key={action}
                      size="small"
                      variant={
                        action === 'approve' || action === 'activate'
                          ? 'contained'
                          : 'outlined'
                      }
                      color={action === 'reject' ? 'error' : 'primary'}
                      onClick={() => onAction(action, row)}
                    >
                      {actionLabel(action)}
                    </Button>
                  ))}
                </Stack>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function actionLabel(action: BoqVersionActionId): string {
  switch (action) {
    case 'submit':
      return 'Submit';
    case 'activate':
      return 'Activate';
    case 'approve':
      return 'Approve';
    case 'reject':
      return 'Reject';
    case 'compare':
      return 'Compare';
    default:
      return action;
  }
}
