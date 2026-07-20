import { Box, Button, Skeleton, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatOptionalCount } from '@/director-command-centre/formatMetric';
import type { PipelineCardModel } from './types';

type Props = {
  cards: readonly PipelineCardModel[];
  loading?: boolean;
};

export function PipelineCards({ cards, loading = false }: Props) {
  return (
    <Box
      data-testid="purchase-pipeline-cards"
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
      }}
    >
      {cards.map((card) => (
        <Box
          key={card.id}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {card.title}
          </Typography>
          {loading ? (
            <Skeleton width="40%" height={36} sx={{ mt: 0.5 }} />
          ) : (
            <Typography
              variant="h5"
              sx={{ mt: 0.5, fontWeight: 700, letterSpacing: -0.5 }}
              data-testid={`pipeline-count-${card.id}`}
            >
              {formatOptionalCount(card.count)}
            </Typography>
          )}
          {!loading ? (
            <Button
              component={RouterLink}
              to={card.drillPath}
              size="small"
              variant="text"
              sx={{ px: 0, mt: 0.5, minWidth: 0 }}
            >
              {card.drillLabel}
            </Button>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
