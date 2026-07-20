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
import type { CategoryCostRow } from './deriveCostForecast';

type Props = {
  rows: readonly CategoryCostRow[];
  totalCost: number | null;
  loading?: boolean;
};

export function CategoryCostTable({ rows, totalCost, loading = false }: Props) {
  return (
    <Paper variant="outlined" data-testid="category-cost-table">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Account category</TableCell>
              <TableCell align="right">Rows</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Drill-down</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">Loading categories…</Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">
                    No posted project costs for this filter.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.accountCategory}>
                  <TableCell>{row.accountCategory}</TableCell>
                  <TableCell align="right">{row.rowCount}</TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.amount)}
                  </TableCell>
                  <TableCell>
                    <DrillDownNav links={row.drillDown} />
                  </TableCell>
                </TableRow>
              ))
            )}
            {!loading ? (
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Total (API)</TableCell>
                <TableCell />
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatOptionalMoney(totalCost)}
                </TableCell>
                <TableCell />
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
