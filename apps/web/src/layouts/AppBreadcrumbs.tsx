import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { getRouteLabel } from '@/navigation/routeRegistry';


export function AppBreadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  const crumbs = [
    { label: 'Home', to: '/' },
    ...parts.map((part, index) => {
      const to = `/${parts.slice(0, index + 1).join('/')}`;
      return {
        label: getRouteLabel(part),
        to,
      };
    }),
  ];

  const visible =
    parts.length === 0 ? [{ label: 'Dashboard', to: '/' }] : crumbs;

  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      sx={{
        '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' },
        maxWidth: '100%',
      }}
    >
      {visible.map((crumb, index) => {
        const isLast = index === visible.length - 1;
        if (isLast) {
          return (
            <Typography
              key={crumb.to}
              color="text.primary"
              sx={{ fontWeight: 600 }}
            >
              {crumb.label}
            </Typography>
          );
        }
        return (
          <Link
            key={crumb.to}
            component={RouterLink}
            to={crumb.to}
            underline="hover"
            color="inherit"
          >
            {crumb.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
