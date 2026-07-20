import { Box, Button, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

/** Neutral empty / not-found surface for lists and detail pages. */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: Props) {
  return (
    <Box
      sx={{
        py: 6,
        px: 2,
        textAlign: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="h6">{title}</Typography>
        {description ? (
          <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
            {description}
          </Typography>
        ) : null}
        {children}
        {actionLabel && onAction ? (
          <Button variant="outlined" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
