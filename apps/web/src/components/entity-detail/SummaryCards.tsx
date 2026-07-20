import { Box, Stack, Typography } from '@mui/material';
import type { EntitySummaryField } from './types';

type Props = {
  fields: readonly EntitySummaryField[];
  title?: string;
};

/**
 * Key facts strip for detail IA. Uses bordered cells (not interactive cards).
 */
export function SummaryCards({ fields, title = 'Summary' }: Props) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <Box data-testid="entity-summary-cards">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', mb: 1, letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        {fields.map((field) => (
          <Box
            key={field.id}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                {field.label}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {field.value}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
