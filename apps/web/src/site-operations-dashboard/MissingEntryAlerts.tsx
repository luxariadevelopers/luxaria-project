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
  loading?: boolean;
};

export function MissingEntryAlerts({ items, loading }: Props) {
  if (loading) {
    return (
      <Stack spacing={1} data-testid="site-missing-alerts-loading">
        <Skeleton variant="rounded" height={56} />
        <Skeleton variant="rounded" height={56} />
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No missing-entry alerts"
        description="Missing DPRs, stock reorder alerts and labour shortfalls for this project will appear here."
      />
    );
  }

  return (
    <Stack spacing={1.5} data-testid="site-missing-alerts">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: 1 }}
      >
        Missing-entry alerts
      </Typography>
      {items.map((item) => (
        <Box
          key={item.id}
          sx={{
            p: 1.5,
            border: '1px solid',
            borderColor:
              item.status === 'missing' ? 'error.light' : 'warning.light',
            borderRadius: 1,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
          >
            {item.status ? (
              <Chip
                size="small"
                color={item.status === 'missing' ? 'error' : 'warning'}
                label={item.status}
              />
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
