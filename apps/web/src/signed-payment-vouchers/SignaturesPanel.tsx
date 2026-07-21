import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { getDocumentDownloadUrl } from '@/api/documents';
import { getErrorMessage } from '@/api/errors';
import { EmptyState } from '@/components/errors';
import type { PublicSignedPaymentVoucher } from './types';

type Props = {
  voucher: PublicSignedPaymentVoucher;
};

type SignatureSlot = {
  id: string;
  label: string;
  documentId: string | null;
};

function SignatureCard({ slot }: { slot: SignatureSlot }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slot.documentId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getDocumentDownloadUrl(slot.documentId)
      .then((result) => {
        if (!cancelled) setUrl(result.download.url);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slot.documentId]);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid={`signed-voucher-signature-${slot.id}`}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {slot.label}
      </Typography>
      {!slot.documentId ? (
        <Typography variant="body2" color="text.secondary">
          Not attached
        </Typography>
      ) : loading ? (
        <CircularProgress size={24} />
      ) : error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : url ? (
        <Box
          component="img"
          src={url}
          alt={slot.label}
          sx={{
            maxWidth: '100%',
            maxHeight: 160,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        />
      ) : null}
    </Paper>
  );
}

export function SignaturesPanel({ voucher }: Props) {
  const slots: SignatureSlot[] = [
    {
      id: 'recipient',
      label: 'Recipient signature',
      documentId: voucher.recipientSignatureDocumentId,
    },
    {
      id: 'engineer',
      label: 'Engineer signature',
      documentId: voucher.engineerSignatureDocumentId,
    },
  ];

  if (voucher.requiresWitnessSignature) {
    slots.push({
      id: 'witness',
      label: 'Witness signature',
      documentId: voucher.witnessSignatureDocumentId,
    });
  }

  if (voucher.requiresRecipientPhoto) {
    slots.push({
      id: 'photo',
      label: 'Recipient photo',
      documentId: voucher.recipientPhotoDocumentId,
    });
  }

  const attached = slots.filter((s) => s.documentId);

  if (attached.length === 0) {
    return (
      <EmptyState
        title="No signatures or photos"
        description="Signatures are captured on mobile before submit."
      />
    );
  }

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="signed-voucher-signatures"
    >
      {slots.map((slot) => (
        <Box key={slot.id} sx={{ flex: '1 1 220px', minWidth: 220 }}>
          <SignatureCard slot={slot} />
        </Box>
      ))}
    </Stack>
  );
}
