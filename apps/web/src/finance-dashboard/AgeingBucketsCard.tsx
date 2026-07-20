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
import { DrillDownNav } from '@/director-command-centre/DrillDownNav';
import {
  formatOptionalCount,
  formatOptionalMoney,
} from '@/director-command-centre/formatMetric';
import type { AgeingBuckets } from './types';

type Props = {
  title: string;
  ageing: AgeingBuckets | null;
  loading?: boolean;
};

const BUCKETS: Array<{ key: keyof AgeingBuckets; label: string }> = [
  { key: 'current', label: 'Current' },
  { key: 'd0_30', label: '0–30' },
  { key: 'd31_60', label: '31–60' },
  { key: 'd61_90', label: '61–90' },
  { key: 'd90Plus', label: '90+' },
];

export function AgeingBucketsCard({
  title,
  ageing,
  loading = false,
}: Props) {
  return (
    <Box
      data-testid="finance-ageing-card"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {loading || !ageing ? (
        <Skeleton variant="rounded" height={100} />
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Total {formatOptionalMoney(ageing.total)} ·{' '}
            {formatOptionalCount(ageing.count)} items
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                {BUCKETS.map((b) => (
                  <TableCell key={b.key} align="right">
                    {b.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                {BUCKETS.map((b) => (
                  <TableCell key={b.key} align="right">
                    {formatOptionalMoney(ageing[b.key] as number)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
          <DrillDownNav links={ageing.drillDown} />
        </Stack>
      )}
    </Box>
  );
}
