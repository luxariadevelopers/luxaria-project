import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import type { SourceUtilisationReport } from './types';

type Props = {
  report: SourceUtilisationReport | undefined;
  loading?: boolean;
  periodLabel: string;
};

export function UtilisationTable({
  report,
  loading = false,
  periodLabel,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="utilisation-table"
    >
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        Source & utilisation of funds
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Accounting classification for {periodLabel}. Difference is
        surplus/(deficit).
      </Typography>

      {loading ? (
        <Typography color="text.secondary">Loading utilisation…</Typography>
      ) : !report ? (
        <Typography color="text.secondary">No utilisation data.</Typography>
      ) : (
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
          >
            <Typography variant="body2">
              Sources: <strong>{formatInr(report.totals.sources)}</strong>
            </Typography>
            <Typography variant="body2">
              Utilisation:{' '}
              <strong>{formatInr(report.totals.utilisation)}</strong>
            </Typography>
            <Typography variant="body2">
              Surplus/(deficit):{' '}
              <strong>{formatInr(report.totals.surplusDeficit)}</strong>
            </Typography>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kind</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.sources.map((row) => (
                <TableRow key={`src-${row.label}`}>
                  <TableCell>Source</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell align="right">{formatInr(row.amount)}</TableCell>
                </TableRow>
              ))}
              {report.utilisation.map((row) => (
                <TableRow key={`use-${row.label}`}>
                  <TableCell>Utilisation</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell align="right">{formatInr(row.amount)}</TableCell>
                </TableRow>
              ))}
              {report.sources.length === 0 &&
              report.utilisation.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary">
                      No posted journal movements in this period.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {report.notes.map((note) => (
            <Typography key={note} variant="caption" color="text.secondary">
              {note}
            </Typography>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
