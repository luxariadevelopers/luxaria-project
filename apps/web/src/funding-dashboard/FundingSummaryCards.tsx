import { Box, Skeleton, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { FundingCardModel } from './types';

type Props = {
  cards: readonly FundingCardModel[];
  loading?: boolean;
};

export function FundingSummaryCards({ cards, loading = false }: Props) {
  return (
    <Box
      data-testid="funding-summary-cards"
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(4, 1fr)',
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
            <Skeleton width="50%" height={36} sx={{ mt: 0.5 }} />
          ) : (
            <Typography
              variant="h5"
              sx={{ mt: 0.5, fontWeight: 700, letterSpacing: -0.5 }}
              data-testid={`funding-card-${card.id}`}
            >
              {formatInr(card.amount)}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {card.hint}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
