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
import { materialUnitLabel } from './labels';
import type { AdjustmentPreviewLine } from './variance';

type Props = {
  lines: readonly AdjustmentPreviewLine[];
  requiresDirectorApproval?: boolean;
};

/**
 * Preview of stock ledger `adjustment` rows that Nest will post on approve→post.
 */
export function AdjustmentPreview({
  lines,
  requiresDirectorApproval,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="adjustment-preview">
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Adjustment preview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Non-zero differences post as immutable stock ledger adjustments
        (quantity in for surplus, quantity out for shortage).
      </Typography>

      {requiresDirectorApproval ? (
        <Alert severity="warning" sx={{ mb: 1.5 }} data-testid="large-variance-banner">
          Large variances detected — approval requires{' '}
          <strong>stock.count.director_approve</strong>.
        </Alert>
      ) : null}

      {lines.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No quantity differences — posting will not create ledger adjustments.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell align="right">Diff</TableCell>
              <TableCell align="right">In</TableCell>
              <TableCell align="right">Out</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Variance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.materialId}>
                <TableCell>{line.materialLabel}</TableCell>
                <TableCell align="right">{line.difference}</TableCell>
                <TableCell align="right">{line.quantityIn || '—'}</TableCell>
                <TableCell align="right">{line.quantityOut || '—'}</TableCell>
                <TableCell>{materialUnitLabel(line.baseUnit)}</TableCell>
                <TableCell>{line.reason ?? '—'}</TableCell>
                <TableCell>
                  {line.isLargeVariance ? 'Large (≥10%)' : 'Within threshold'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
