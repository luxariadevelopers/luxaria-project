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
import { formatDate, formatInr } from '@/format';
import { AgreementStatusChip } from './AgreementStatusChip';
import type { PublicContractorAgreement } from './types';

type Props = {
  versions: readonly PublicContractorAgreement[];
  currentId: string;
};

export function VersionHistoryTable({ versions, currentId }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="agreement-version-history">
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Version history
      </Typography>
      {versions.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No version rows returned for this agreement number.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Agreed value</TableCell>
              <TableCell>End date</TableCell>
              <TableCell>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {versions.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  bgcolor:
                    row.id === currentId ? 'action.selected' : undefined,
                }}
              >
                <TableCell>v{row.version}</TableCell>
                <TableCell>
                  <AgreementStatusChip status={row.status} />
                </TableCell>
                <TableCell align="right">{formatInr(row.agreedRates)}</TableCell>
                <TableCell>{formatDate(row.endDate)}</TableCell>
                <TableCell>
                  {row.id === currentId ? (
                    'Current'
                  ) : (
                    <Link
                      component={RouterLink}
                      to={`/contractors/agreements/${row.id}`}
                      underline="hover"
                    >
                      Open
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
