import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { formatMaskedPan } from './bankMasking';
import type { PublicInvestor } from './types';

type Props = {
  investor: PublicInvestor;
  canView: boolean;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

/** Nominee panel — PAN masked by default. */
export function InvestorNomineeCard({ investor, canView }: Props) {
  const [revealPan, setRevealPan] = useState(false);
  const nominee = investor.nominee;

  if (!canView) {
    return (
      <PermissionDenied
        title="Nominee unavailable"
        message="You need investor.view to open nominee details."
        showHomeLink={false}
      />
    );
  }

  if (!nominee || (!nominee.fullName && !nominee.pan && !nominee.relationship)) {
    return (
      <EmptyState
        title="No nominee"
        description="Nominee details appear when saved on the investor record."
      />
    );
  }

  return (
    <Stack
      spacing={1.5}
      data-testid="investor-nominee-card"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Field label="Full name" value={nominee.fullName ?? '—'} />
      <Field label="Relationship" value={nominee.relationship ?? '—'} />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.25}>
          <Typography variant="caption" color="text.secondary">
            PAN
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
            data-testid="investor-nominee-pan"
            data-revealed={revealPan ? 'true' : 'false'}
          >
            {formatMaskedPan(nominee.pan, revealPan)}
          </Typography>
        </Stack>
        {nominee.pan ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => setRevealPan((v) => !v)}
            data-testid="investor-nominee-pan-reveal"
          >
            {revealPan ? 'Hide PAN' : 'Reveal PAN'}
          </Button>
        ) : null}
      </Stack>
      <Field label="Phone" value={nominee.phone ?? '—'} />
      <Field label="Email" value={nominee.email ?? '—'} />
      <Field
        label="Share %"
        value={
          nominee.sharePercent != null ? String(nominee.sharePercent) : '—'
        }
      />
    </Stack>
  );
}
