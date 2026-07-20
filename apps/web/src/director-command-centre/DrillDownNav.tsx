import { Link as RouterLink } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { resolveDrillDownLinks } from './drillDownLinks';
import type { DrillDownLink } from './types';

type Props = {
  links: readonly DrillDownLink[];
};

/** Safe navigation only — maps API hrefs to shipped portal routes. */
export function DrillDownNav({ links }: Props) {
  const { hasAnyPermission } = useAuth();
  const resolved = resolveDrillDownLinks(links, { hasAnyPermission });

  if (resolved.length === 0) {
    return null;
  }

  return (
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', mt: 0.5 }}
    >
      {resolved.map((link) => (
        <Button
          key={link.to}
          component={RouterLink}
          to={link.to}
          size="small"
          variant="text"
          sx={{ px: 0.5, minWidth: 0 }}
        >
          {link.label}
        </Button>
      ))}
    </Stack>
  );
}
