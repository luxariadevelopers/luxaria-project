import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { RetryPanel } from '@/components/errors';
import type { PdfResolveResult } from './types';

type Props = {
  open: boolean;
  title: string;
  loading: boolean;
  error: unknown;
  preview: PdfResolveResult | null;
  onClose: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
};

export function PdfPreviewDialog({
  open,
  title,
  loading,
  error,
  preview,
  onClose,
  onRetry,
  onDownload,
  onPrint,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack sx={{ py: 6, alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Preparing PDF…
            </Typography>
          </Stack>
        ) : null}

        {!loading && error ? (
          <RetryPanel error={error} onRetry={onRetry} forceRetry />
        ) : null}

        {!loading && !error && preview ? (
          <Box
            component="iframe"
            title={title}
            src={preview.url}
            sx={{
              width: '100%',
              height: 480,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ) : null}

        {!loading && !error && !preview ? (
          <Typography color="text.secondary">No preview available.</Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        {onPrint ? (
          <Button onClick={onPrint} disabled={loading || !preview}>
            Print
          </Button>
        ) : null}
        {onDownload ? (
          <Button onClick={onDownload} disabled={loading || !preview}>
            Download
          </Button>
        ) : null}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
