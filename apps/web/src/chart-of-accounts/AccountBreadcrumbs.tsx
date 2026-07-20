import { Breadcrumbs, Link, Typography } from '@mui/material';
import type { PublicAccount } from './types';

type Props = {
  path: readonly PublicAccount[];
  onSelect?: (accountId: string) => void;
};

/** Hierarchy trail root → selected account (not app route breadcrumbs). */
export function AccountBreadcrumbs({ path, onSelect }: Props) {
  if (path.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No hierarchy path
      </Typography>
    );
  }

  return (
    <Breadcrumbs
      aria-label="Account hierarchy"
      sx={{
        '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' },
      }}
    >
      {path.map((account, index) => {
        const isLast = index === path.length - 1;
        const label = `${account.accountCode} · ${account.accountName}`;
        if (isLast || !onSelect) {
          return (
            <Typography
              key={account.id}
              variant="body2"
              color={isLast ? 'text.primary' : 'text.secondary'}
              sx={{ fontWeight: isLast ? 600 : 400 }}
            >
              {label}
            </Typography>
          );
        }
        return (
          <Link
            key={account.id}
            component="button"
            type="button"
            underline="hover"
            color="inherit"
            variant="body2"
            onClick={() => onSelect(account.id)}
            sx={{ cursor: 'pointer', border: 0, background: 'none', p: 0 }}
          >
            {label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
