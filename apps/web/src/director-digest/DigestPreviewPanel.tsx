import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { DigestSummaryCards } from './DigestSummaryCards';
import type { DirectorDigestCapabilities } from './roleAccess';
import { useDirectorDigestPreview } from './useDirectorDigest';

type Props = {
  caps: DirectorDigestCapabilities;
  date: string;
  onDateChange: (date: string) => void;
};

export function DigestPreviewPanel({ caps, date, onDateChange }: Props) {
  const [enabled, setEnabled] = useState(false);

  const preview = useDirectorDigestPreview(
    { date: date || undefined },
    caps.canView && enabled,
  );

  const load = () => {
    setEnabled(true);
    void preview.refetch();
  };

  if (!caps.canView) {
    return (
      <PermissionDenied
        title="Digest preview unavailable"
        message="You need the director_digest.view permission to preview your daily digest."
      />
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="director-digest-preview">
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          useFlexGap
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="h6">Your digest preview</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              type="date"
              label="Digest date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 160 }}
            />
            <Button
              variant="contained"
              startIcon={
                preview.isFetching ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshOutlinedIcon />
                )
              }
              onClick={load}
              disabled={preview.isFetching}
            >
              Load preview
            </Button>
          </Stack>
        </Stack>

        {!enabled && !preview.data ? (
          <EmptyState
            title="No preview loaded"
            description="Choose a digest date and load preview. Empty date defaults to yesterday (UTC)."
          />
        ) : null}

        {preview.error && isForbiddenError(preview.error) ? (
          <PermissionDenied
            error={preview.error}
            title="Preview denied"
            message="You cannot preview the director digest."
          />
        ) : null}

        {preview.error && !isForbiddenError(preview.error) ? (
          <Alert severity="error">
            {getErrorMessage(preview.error, 'Unable to load digest preview')}
          </Alert>
        ) : null}

        {preview.isLoading && enabled ? (
          <Typography color="text.secondary">Loading digest…</Typography>
        ) : null}

        {preview.data ? <DigestSummaryCards digest={preview.data} /> : null}
      </Stack>
    </Paper>
  );
}
