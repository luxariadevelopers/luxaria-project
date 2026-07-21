import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  awardTender,
  compareTenderBids,
  recommendTender,
} from '@/contractor-tenders/api';

/**
 * Bid comparison — `/contractor-tenders/:id/compare`
 * Permissions: `tender.view` (compare), `tender.manage` (recommend),
 * `tender.award` (award). See `CTR-INTEGRATION.md`.
 */
export function BidComparisonPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const { success, error: notifyError } = useNotify();
  const queryClient = useQueryClient();

  const canView = hasPermission('tender.view');
  const canManage = hasPermission('tender.manage');
  const canAward = hasPermission('tender.award');

  const query = useQuery({
    queryKey: ['contractor-tenders', id, 'compare'],
    queryFn: () => compareTenderBids(id),
    enabled: canView && Boolean(id),
  });

  const recommend = useMutation({
    mutationFn: (contractorId: string) =>
      recommendTender(id, {
        recommendedContractorId: contractorId,
        rationale: 'Recommended from bid comparison (lowest commercial / fit).',
      }),
    onSuccess: async () => {
      success('Recommendation saved');
      await queryClient.invalidateQueries({
        queryKey: ['contractor-tenders', id, 'compare'],
      });
    },
    onError: (err) => notifyError(getErrorMessage(err)),
  });

  const award = useMutation({
    mutationFn: (contractorId: string) =>
      awardTender(id, { awardedContractorId: contractorId }),
    onSuccess: async () => {
      success('Tender awarded');
      await queryClient.invalidateQueries({
        queryKey: ['contractor-tenders', id, 'compare'],
      });
    },
    onError: (err) => notifyError(getErrorMessage(err)),
  });

  if (!canView) return <PermissionDenied />;
  if (!id) {
    return <Alert severity="warning">Missing tender id.</Alert>;
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const tender = query.data?.tender;
  const comparison = query.data?.comparison;
  const underEvaluation = tender?.status === 'under_evaluation';

  return (
    <Stack spacing={2.5} data-testid="bid-comparison-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Stack spacing={0.5}>
          <Link
            component={RouterLink}
            to="/contractor-tenders"
            underline="hover"
            variant="body2"
          >
            ← Tenders
          </Link>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h5" component="h1">
              {tender?.tenderNumber ?? 'Bid comparison'}
            </Typography>
            {tender ? (
              <Chip
                size="small"
                label={tender.status.replaceAll('_', ' ')}
                color={
                  tender.status === 'awarded'
                    ? 'success'
                    : tender.status === 'under_evaluation'
                      ? 'info'
                      : 'default'
                }
              />
            ) : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {tender?.title ?? 'Loading comparison…'}
          </Typography>
        </Stack>
      </Stack>

      {comparison?.lowestCommercialContractorId ? (
        <Alert severity="info">
          Lowest commercial:{' '}
          <strong>
            {comparison.lowestCommercialTotal?.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </strong>{' '}
          · contractor {comparison.lowestCommercialContractorId.slice(-6)}
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Contractor</TableCell>
              <TableCell>Technical</TableCell>
              <TableCell>Score</TableCell>
              <TableCell align="right">Commercial total</TableCell>
              <TableCell>Flags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !comparison || comparison.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    No bid rows to compare.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              comparison.rows.map((row) => (
                <TableRow key={row.contractorId}>
                  <TableCell>{row.rankByCommercial ?? '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {row.contractorId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.hasTechnicalBid ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell>
                    {row.technicalScore == null ? '—' : row.technicalScore}
                  </TableCell>
                  <TableCell align="right">
                    {row.commercialTotal == null
                      ? '—'
                      : row.commercialTotal.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      {row.isRecommended ? (
                        <Chip size="small" color="info" label="Recommended" />
                      ) : null}
                      {row.isAwarded ? (
                        <Chip size="small" color="success" label="Awarded" />
                      ) : null}
                      {!row.invited ? (
                        <Chip size="small" label="Not invited" />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ justifyContent: 'flex-end' }}
                    >
                      {canManage && underEvaluation && !row.isRecommended ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={recommend.isPending}
                          onClick={() => recommend.mutate(row.contractorId)}
                        >
                          Recommend
                        </Button>
                      ) : null}
                      {canAward && underEvaluation && !row.isAwarded ? (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={award.isPending}
                          onClick={() => award.mutate(row.contractorId)}
                        >
                          Award
                        </Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {tender?.recommendation ? (
        <Alert severity="success">
          Recommended contractor{' '}
          <strong>{tender.recommendation.recommendedContractorId}</strong>
          {' — '}
          {tender.recommendation.rationale}
        </Alert>
      ) : null}
    </Stack>
  );
}
