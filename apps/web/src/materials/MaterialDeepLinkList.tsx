import { Link as RouterLink } from 'react-router-dom';
import {
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState, RetryPanel } from '@/components/errors';
import { materialUnitLabel } from './labels';
import { materialDetailPath } from './paths';
import { MaterialStatusChip } from './MaterialStatusChip';
import type { PublicMaterial } from './types';

type Props = {
  rows: readonly PublicMaterial[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
};

/**
 * Minimal deep-link list for Phase 059 — full catalogue UI is Phase 058.
 * Rows navigate to `/inventory/materials/:id`.
 */
export function MaterialDeepLinkList({
  rows,
  loading,
  error,
  onRetry,
}: Props) {
  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading && rows.length === 0) {
    return (
      <Typography color="text.secondary" data-testid="material-deeplink-list">
        Loading materials…
      </Typography>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No materials"
        description="No material master records are available to open."
      />
    );
  }

  return (
    <Paper variant="outlined" data-testid="material-deeplink-list">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>
                <Link
                  component={RouterLink}
                  to={materialDetailPath(row.id)}
                  underline="hover"
                >
                  {row.materialCode}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  component={RouterLink}
                  to={materialDetailPath(row.id)}
                  underline="hover"
                  color="inherit"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>{materialUnitLabel(row.baseUnit)}</TableCell>
              <TableCell>
                <MaterialStatusChip status={row.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
