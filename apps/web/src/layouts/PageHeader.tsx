import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import { getPageTitle } from '@/navigation/routeRegistry';
import { AppBreadcrumbs } from './AppBreadcrumbs';

type PageHeaderProps = {
  /** Override title derived from the current route. */
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Hide the automatic title (pages that render their own h1/h4). */
  hideTitle?: boolean;
};

/**
 * Consistent page chrome inside the app shell: breadcrumbs, title, actions.
 * Keeps the first content band stable across desktop and narrow viewports.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  hideTitle = false,
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const resolvedTitle = title ?? getPageTitle(pathname);

  return (
    <Stack
      spacing={1}
      sx={{
        mb: 2.5,
        minWidth: 0,
      }}
    >
      <AppBreadcrumbs />
      {!hideTitle ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, flex: '1 1 200px' }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem' },
                wordBreak: 'break-word',
              }}
            >
              {resolvedTitle}
            </Typography>
            {subtitle ? (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {actions ? (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                flex: '0 1 auto',
              }}
            >
              {actions}
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Stack>
  );
}
