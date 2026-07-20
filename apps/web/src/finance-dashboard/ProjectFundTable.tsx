import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState } from '@/components/errors';
import { DrillDownNav } from '@/director-command-centre/DrillDownNav';
import { formatOptionalMoney } from '@/director-command-centre/formatMetric';
import type { ProjectFundRow } from './types';

type Props = {
  rows: readonly ProjectFundRow[];
  loading?: boolean;
};

export function ProjectFundTable({ rows, loading = false }: Props) {
  if (loading) {
    return <Skeleton variant="rounded" height={140} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No project fund rows"
        description="Liquidity and payables by project appear when accounts exist in scope."
      />
    );
  }

  return (
    <Box data-testid="finance-project-funds">
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Project fund position
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Project</TableCell>
            <TableCell align="right">Bank</TableCell>
            <TableCell align="right">Cash</TableCell>
            <TableCell align="right">Vendor payable</TableCell>
            <TableCell align="right">Contractor payable</TableCell>
            <TableCell align="right">Net</TableCell>
            <TableCell>Open</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.projectId}>
              <TableCell>
                {row.projectCode ?? '—'}
                {row.projectName ? ` · ${row.projectName}` : ''}
              </TableCell>
              <TableCell align="right">
                {formatOptionalMoney(row.bankBalance)}
              </TableCell>
              <TableCell align="right">
                {formatOptionalMoney(row.cashBalance)}
              </TableCell>
              <TableCell align="right">
                {formatOptionalMoney(row.vendorPayable)}
              </TableCell>
              <TableCell align="right">
                {formatOptionalMoney(row.contractorPayable)}
              </TableCell>
              <TableCell align="right">
                {formatOptionalMoney(row.netFundPosition)}
              </TableCell>
              <TableCell>
                <DrillDownNav links={row.drillDown} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
