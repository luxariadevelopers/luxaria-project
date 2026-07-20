import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { BoqImportIssue } from './validateImport';

type Props = {
  issues: readonly BoqImportIssue[];
};

export function ImportErrorGrid({ issues }: Props) {
  if (issues.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No validation issues.
      </Typography>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{ overflow: 'auto' }}
      data-testid="boq-import-error-grid"
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Severity</TableCell>
            <TableCell>Row</TableCell>
            <TableCell>Column / code</TableCell>
            <TableCell>Message</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {issues.map((issue, index) => (
            <TableRow key={`${issue.code}-${issue.rowNumber ?? 'x'}-${index}`}>
              <TableCell>{issue.severity}</TableCell>
              <TableCell>{issue.rowNumber ?? '—'}</TableCell>
              <TableCell>{issue.column ?? issue.boqCode ?? '—'}</TableCell>
              <TableCell>{issue.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
