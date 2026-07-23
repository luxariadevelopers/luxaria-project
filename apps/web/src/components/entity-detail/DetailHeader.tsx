import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { EntityDetailHeaderProps } from './types';

/**
 * Standard entity detail header: back link, title, business code, optional meta.
 */
export function DetailHeader({
  title,
  code,
  subtitle,
  backTo,
  backLabel = 'Back',
  meta,
}: EntityDetailHeaderProps) {
  return (
    <Stack spacing={1} data-testid="entity-detail-header">
      {backTo ? (
        <Button
          component={RouterLink}
          to={backTo}
          size="small"
          sx={{ alignSelf: 'flex-start', px: 0 }}
        >
          ← {backLabel}
        </Button>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        sx={{
          alignItems: { xs: 'flex-start', sm: 'baseline' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              wordBreak: 'break-word',
            }}
          >
            {title}
          </Typography>
          {code ? (
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{
                fontFamily: 'ui-monospace, monospace',
                wordBreak: 'break-all',
              }}
            >
              {code}
            </Typography>
          ) : null}
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {meta ? <Box>{meta}</Box> : null}
      </Stack>
    </Stack>
  );
}
