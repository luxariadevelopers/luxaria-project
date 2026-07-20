import { Link as RouterLink } from 'react-router-dom';
import { Link, Stack, Typography } from '@mui/material';
import { resolveJournalSourceLink } from './sourceLinks';
import type { PublicJournalEntry } from './types';

type Props = {
  row: PublicJournalEntry;
};

/** Source module + entity identifiers; links when a portal route exists. */
export function JournalSourceCell({ row }: Props) {
  const source = resolveJournalSourceLink(row);

  return (
    <Stack spacing={0.25} sx={{ py: 0.5, minWidth: 0 }}>
      {source.href ? (
        <Link
          component={RouterLink}
          to={source.href}
          variant="body2"
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          {source.label}
        </Link>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {source.label}
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        title={source.detail}
      >
        {source.detail}
      </Typography>
    </Stack>
  );
}
