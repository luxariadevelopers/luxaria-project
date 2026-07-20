import { Box, Chip, Skeleton, Typography } from '@mui/material';
import type { SiteActivityCardModel, SiteActivityStatus } from './types';

function chipColor(
  status: SiteActivityStatus,
): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'complete':
      return 'success';
    case 'pending':
      return 'warning';
    case 'missing':
      return 'error';
    case 'awaiting_cutoff':
      return 'info';
    default:
      return 'default';
  }
}

type Props = {
  card: SiteActivityCardModel;
  loading?: boolean;
};

export function SiteActivityCard({ card, loading }: Props) {
  return (
    <Box
      data-testid={`site-card-${card.kind}`}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {card.title}
      </Typography>
      {loading ? (
        <Skeleton width="50%" height={32} sx={{ mt: 1 }} />
      ) : (
        <>
          <Chip
            size="small"
            color={chipColor(card.status)}
            label={card.summary}
            sx={{ mt: 1 }}
          />
          {card.detailLines.map((line) => (
            <Typography
              key={line}
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75 }}
            >
              {line}
            </Typography>
          ))}
        </>
      )}
    </Box>
  );
}
