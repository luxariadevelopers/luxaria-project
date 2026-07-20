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
import { DrillDownNav } from './DrillDownNav';
import {
  formatOptionalMoney,
  formatOptionalPercent,
} from './formatMetric';
import type {
  BoqUtilisationRow,
  CostVersusBudgetRow,
  ProgressRow,
} from './types';

type Props = {
  costVersusBudget: readonly CostVersusBudgetRow[];
  physicalProgress: readonly ProgressRow[];
  boqUtilisation: readonly BoqUtilisationRow[];
  loading?: boolean;
};

export function ProjectSummarySection({
  costVersusBudget,
  physicalProgress,
  boqUtilisation,
  loading = false,
}: Props) {
  return (
    <Box data-testid="director-project-summary">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: 1, display: 'block', mb: 1 }}
      >
        Project summary
      </Typography>

      {loading ? (
        <Skeleton variant="rounded" height={160} />
      ) : costVersusBudget.length === 0 &&
        physicalProgress.length === 0 &&
        boqUtilisation.length === 0 ? (
        <EmptyState
          title="No project metrics"
          description="Cost, progress and BOQ utilisation appear when projects are in scope."
        />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Project</TableCell>
              <TableCell align="right">Budget</TableCell>
              <TableCell align="right">Actual</TableCell>
              <TableCell align="right">Utilisation</TableCell>
              <TableCell align="right">Progress</TableCell>
              <TableCell>Open</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mergeProjectRows(
              costVersusBudget,
              physicalProgress,
              boqUtilisation,
            ).map((row) => (
              <TableRow key={row.projectId}>
                <TableCell>
                  {row.projectCode ?? '—'}
                  {row.projectName ? ` · ${row.projectName}` : ''}
                </TableCell>
                <TableCell align="right">
                  {formatOptionalMoney(row.budgetAmount)}
                </TableCell>
                <TableCell align="right">
                  {formatOptionalMoney(row.actualCost)}
                </TableCell>
                <TableCell align="right">
                  {formatOptionalPercent(row.utilisationPercent)}
                </TableCell>
                <TableCell align="right">
                  {formatOptionalPercent(row.progressPercent)}
                </TableCell>
                <TableCell>
                  <DrillDownNav links={row.drillDown} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

type MergedRow = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  budgetAmount: number | null;
  actualCost: number | null;
  utilisationPercent: number | null;
  progressPercent: number | null;
  drillDown: CostVersusBudgetRow['drillDown'];
};

function mergeProjectRows(
  cost: readonly CostVersusBudgetRow[],
  progress: readonly ProgressRow[],
  boq: readonly BoqUtilisationRow[],
): MergedRow[] {
  const map = new Map<string, MergedRow>();

  for (const row of cost) {
    map.set(row.projectId, {
      projectId: row.projectId,
      projectCode: row.projectCode,
      projectName: row.projectName,
      budgetAmount: row.budgetAmount,
      actualCost: row.actualCost,
      utilisationPercent: row.utilisationPercent,
      progressPercent: null,
      drillDown: row.drillDown,
    });
  }

  for (const row of progress) {
    const existing = map.get(row.projectId);
    if (existing) {
      existing.progressPercent = row.progressPercent;
      if (!existing.drillDown.length) {
        existing.drillDown = row.drillDown;
      }
    } else {
      map.set(row.projectId, {
        projectId: row.projectId,
        projectCode: row.projectCode,
        projectName: row.projectName,
        budgetAmount: null,
        actualCost: null,
        utilisationPercent: null,
        progressPercent: row.progressPercent,
        drillDown: row.drillDown,
      });
    }
  }

  for (const row of boq) {
    const existing = map.get(row.projectId);
    if (existing) {
      if (existing.utilisationPercent === null) {
        existing.utilisationPercent = row.utilisedQuantityPercent;
      }
    } else {
      map.set(row.projectId, {
        projectId: row.projectId,
        projectCode: row.projectCode,
        projectName: row.projectName,
        budgetAmount: null,
        actualCost: null,
        utilisationPercent: row.utilisedQuantityPercent,
        progressPercent: null,
        drillDown: row.drillDown,
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    (a.projectCode ?? '').localeCompare(b.projectCode ?? ''),
  );
}
