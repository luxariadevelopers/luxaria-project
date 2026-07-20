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
import { formatOptionalMoney } from './formatMoney';
import { DrillDownNav } from './DrillDownNav';
import type { VarianceRow } from './deriveCostForecast';

type Props = {
  rows: readonly VarianceRow[];
  loading?: boolean;
};

export function VarianceDrillDownPanel({ rows, loading = false }: Props) {
  return (
    <Paper variant="outlined" data-testid="variance-drill-down">
      <Typography variant="subtitle1" sx={{ p: 2, pb: 0 }}>
        Variance drill-down
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell align="right">Baseline</TableCell>
              <TableCell align="right">Compare</TableCell>
              <TableCell align="right">Variance</TableCell>
              <TableCell>Links</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">Loading variances…</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.baselineAmount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.compareAmount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.varianceAmount)}
                  </TableCell>
                  <TableCell>
                    <DrillDownNav links={row.drillDown} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
