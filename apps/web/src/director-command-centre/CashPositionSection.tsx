import {
  Box,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState } from '@/components/errors';
import { DrillDownNav } from './DrillDownNav';
import { formatOptionalMoney } from './formatMetric';
import { KpiCard } from './KpiCard';
import type { MoneyTile, ProjectMoneyRow } from './types';

type Props = {
  bankTotal: MoneyTile | null;
  cashTotal: MoneyTile | null;
  projectBank: readonly ProjectMoneyRow[];
  projectPetty: readonly ProjectMoneyRow[];
  loading?: boolean;
};

export function CashPositionSection({
  bankTotal,
  cashTotal,
  projectBank,
  projectPetty,
  loading = false,
}: Props) {
  return (
    <Stack spacing={2} data-testid="director-cash-position">
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Cash position
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <KpiCard
          title="Company bank balance"
          amount={bankTotal?.amount}
          loading={loading}
          drillDown={bankTotal?.drillDown ?? []}
        />
        <KpiCard
          title="Cash / petty balance"
          amount={cashTotal?.amount}
          loading={loading}
          drillDown={cashTotal?.drillDown ?? []}
        />
      </Box>

      <ProjectMoneyTable
        title="Bank by project"
        rows={projectBank}
        loading={loading}
      />
      <ProjectMoneyTable
        title="Petty cash by project"
        rows={projectPetty}
        loading={loading}
      />
    </Stack>
  );
}

function ProjectMoneyTable({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: readonly ProjectMoneyRow[];
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton variant="rounded" height={120} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={`No ${title.toLowerCase()} rows`}
        description="Balances will appear when accounts exist for accessible projects."
      />
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Project</TableCell>
            <TableCell align="right">Amount</TableCell>
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
                {formatOptionalMoney(row.amount)}
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
