import {
  Box,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState } from '@/components/errors';
import { DrillDownNav } from '@/director-command-centre/DrillDownNav';
import { formatOptionalCount } from '@/director-command-centre/formatMetric';
import type { ProjectDashboardSummary } from '@/director-command-centre/projectDashboardTypes';

type Props = {
  sitePhotos: ProjectDashboardSummary['sitePhotos'] | null;
  loading?: boolean;
};

/**
 * Site photo list from the project dashboard payload.
 * `href` values are API paths — we show metadata only (no invented media URLs).
 */
export function SitePhotosStrip({ sitePhotos, loading = false }: Props) {
  if (loading || !sitePhotos) {
    return <Skeleton variant="rounded" height={100} />;
  }

  if (sitePhotos.count === 0 || sitePhotos.recent.length === 0) {
    return (
      <EmptyState
        title="No recent site photos"
        description="Photos attached via project documents or DPR will appear here."
      />
    );
  }

  return (
    <Stack spacing={1} data-testid="project-site-photos">
      <Typography variant="body2" color="text.secondary">
        {formatOptionalCount(sitePhotos.count)} photo
        {sitePhotos.count === 1 ? '' : 's'} on record
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        {sitePhotos.recent.map((photo) => (
          <Box
            key={photo.id}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {photo.fileName ?? 'Photo'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {photo.source}
              {photo.reportDate
                ? ` · ${photo.reportDate.slice(0, 10)}`
                : ''}
            </Typography>
          </Box>
        ))}
      </Box>
      <DrillDownNav links={sitePhotos.drillDown} />
    </Stack>
  );
}
