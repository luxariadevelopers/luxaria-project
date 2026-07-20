import { useMemo } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { QuickSearchHit } from './types';

type Props = {
  moduleLabel: string;
  /** Shown when opened without a quick-search hit. */
  emptyHint: string;
};

type LocationState = {
  quickSearchHit?: QuickSearchHit;
};

/**
 * Thin landing page for quick-search targets until full module UIs ship.
 * Route guards still enforce view permissions; `?id=` identifies the record.
 */
export function ModuleRecordPage({ moduleLabel, emptyHint }: Props) {
  const [params] = useSearchParams();
  const location = useLocation();
  const id = params.get('id');
  const hit = (location.state as LocationState | null)?.quickSearchHit;

  const summary = useMemo(() => {
    if (hit && hit.id === id) {
      return hit;
    }
    if (id) {
      return {
        id,
        title: id,
        subtitle: moduleLabel,
        status: null as string | null,
      };
    }
    return null;
  }, [hit, id, moduleLabel]);

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">{emptyHint}</Typography>
      {summary ? (
        <Alert severity="info" variant="outlined">
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {summary.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.subtitle}
            {summary.status ? ` · ${summary.status}` : ''}
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block' }}
          >
            Record id: {summary.id}
          </Typography>
        </Alert>
      ) : (
        <Typography color="text.secondary">
          Open a record from quick search (header search or ⌘K / Ctrl+K).
        </Typography>
      )}
    </Stack>
  );
}
