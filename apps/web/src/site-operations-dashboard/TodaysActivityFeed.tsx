import {
  Box,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState } from '@/components/errors';
import type { SiteFeedItem } from './types';

type Props = {
  items: readonly SiteFeedItem[];
  asOfKey: string;
  loading?: boolean;
};

export function TodaysActivityFeed({ items, asOfKey, loading }: Props) {
  if (loading) {
    return (
      <Stack spacing={1} data-testid="site-activity-feed-loading">
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={48} />
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity for this day"
        description={`Nothing recorded for ${asOfKey} yet (UTC calendar day from the project dashboard).`}
      />
    );
  }

  return (
    <Stack spacing={1.5} data-testid="site-activity-feed">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: 1 }}
      >
        Today&apos;s activity ({asOfKey} UTC)
      </Typography>
      {items.map((item) => (
        <Box
          key={item.id}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Chip size="small" variant="outlined" label={item.kind} />
            {item.status ? (
              <Chip size="small" label={item.status} />
            ) : null}
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              {item.title}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {item.subtitle}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
