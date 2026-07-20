import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';

const LABELS: Record<string, string> = {
  '': 'Dashboard',
  users: 'Users',
  projects: 'Projects',
  sales: 'Sales',
  collections: 'Collections',
  settings: 'Settings',
  forbidden: 'Access denied',
};

export function AppBreadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  const crumbs = [
    { label: 'Home', to: '/' },
    ...parts.map((part, index) => {
      const to = `/${parts.slice(0, index + 1).join('/')}`;
      return {
        label: LABELS[part] ?? part,
        to,
      };
    }),
  ];

  // Avoid duplicate Home / Dashboard on root
  const visible =
    parts.length === 0
      ? [{ label: 'Dashboard', to: '/' }]
      : crumbs;

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {visible.map((crumb, index) => {
        const isLast = index === visible.length - 1;
        if (isLast) {
          return (
            <Typography key={crumb.to} color="text.primary" sx={{ fontWeight: 600 }}>
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
