import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import { buildSideBySideRows } from './comparison';
import { ImpactSummary } from './ImpactSummary';
import type { BoqVersionComparison } from './types';

type Props = {
  comparison: BoqVersionComparison;
};

function kindLabel(kind: 'added' | 'removed' | 'changed'): string {
  if (kind === 'added') return 'Added';
  if (kind === 'removed') return 'Removed';
  return 'Changed';
}

function moneyOrDash(value: number | null): string {
  if (value == null) return '—';
  return formatInr(value);
}

function deltaLabel(delta: number | null): string {
  if (delta == null) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatInr(delta)}`;
}

export function VersionCompareView({ comparison }: Props) {
  const rows = buildSideBySideRows(comparison);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="boq-version-compare"
    >
      <ImpactSummary comparison={comparison} />
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
        Side-by-side comparison
      </Typography>
      {rows.length === 0 ? (
        <Typography color="text.secondary">
          No item differences between these versions.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Change</TableCell>
              <TableCell>BOQ code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">From value</TableCell>
              <TableCell align="right">To value</TableCell>
              <TableCell align="right">Delta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.key}
                sx={{
                  bgcolor:
                    row.kind === 'changed' ? 'action.hover' : undefined,
                }}
              >
                <TableCell>{kindLabel(row.kind)}</TableCell>
                <TableCell>{row.boqCode}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell align="right">
                  {moneyOrDash(row.fromValue)}
                </TableCell>
                <TableCell align="right">
                  {moneyOrDash(row.toValue)}
                </TableCell>
                <TableCell align="right">
                  {deltaLabel(row.deltaValue)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
