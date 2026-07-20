import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * When true, disables nested controls (fieldset) — use for missing permission
   * or immutable workflow status. Prefer this over only hiding submit.
   */
  disabled?: boolean;
  disabledReason?: string;
  id?: string;
};

/**
 * Accessible form section with optional permission/status lock.
 */
export function FormSection({
  title,
  description,
  children,
  disabled = false,
  disabledReason,
  id,
}: FormSectionProps) {
  const headingId = id ?? `form-section-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <Box
      component="fieldset"
      disabled={disabled}
      aria-labelledby={headingId}
      sx={{
        m: 0,
        p: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        minInlineSize: 0,
        opacity: disabled ? 0.72 : 1,
      }}
    >
      <Typography
        component="legend"
        id={headingId}
        variant="h6"
        sx={{ px: 0.5, float: 'none', width: 'auto' }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2, mt: -0.5 }}>
          {description}
        </Typography>
      ) : null}
      {disabled && disabledReason ? (
        <Typography
          role="status"
          color="warning.main"
          variant="body2"
          sx={{ mb: 2 }}
        >
          {disabledReason}
        </Typography>
      ) : null}
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}
