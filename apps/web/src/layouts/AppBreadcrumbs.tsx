import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import {
  findRouteByPathname,
  getRouteLabel,
  normalisePathname,
} from '@/navigation/routeRegistry';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isIdSegment(segment: string): boolean {
  return OBJECT_ID_RE.test(segment) || UUID_RE.test(segment);
}

function crumbLabel(segment: string, path: string): string {
  const route = findRouteByPathname(path);
  if (route) {
    return route.title;
  }
  if (isIdSegment(segment)) {
    return 'Details';
  }
  // getRouteLabel uses ROUTE_LABELS, then humanizes kebab segments.
  return getRouteLabel(segment);
}

/**
 * Breadcrumbs from the current pathname using route-registry titles
 * (never raw URL segments when a label exists).
 */
export function AppBreadcrumbs() {
  const location = useLocation();
  const normalised = normalisePathname(location.pathname);
  const parts = normalised.split('/').filter(Boolean);

  const crumbs =
    parts.length === 0
      ? [{ label: 'Dashboard', to: '/' }]
      : [
          { label: 'Home', to: '/' },
          ...parts.map((part, index) => {
            const to = `/${parts.slice(0, index + 1).join('/')}`;
            return {
              label: crumbLabel(part, to),
              to,
            };
          }),
        ];

  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      maxItems={4}
      itemsBeforeCollapse={1}
      itemsAfterCollapse={2}
      sx={{
        minWidth: 0,
        '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
        '& .MuiBreadcrumbs-li': { minWidth: 0 },
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        if (isLast) {
          return (
            <Typography
              key={crumb.to}
              color="text.primary"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: 160, sm: 280 },
              }}
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
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: { xs: 120, sm: 200 },
            }}
          >
            {crumb.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
