import { useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { resolveAccountDisplay } from '@/vendors/bankMasking';
import type { PublicContractor } from './types';

type Props = {
  contractor: PublicContractor;
  canView: boolean;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" data-testid={`contractor-bank-field-${label}`}>
        {value}
      </Typography>
    </Stack>
  );
}

export function ContractorBankCard({ contractor, canView }: Props) {
  const [revealed, setRevealed] = useState(false);
  const bank = contractor.bankDetails;

  if (!canView) {
    return (
      <PermissionDenied
        title="Bank details unavailable"
        message="You need contractor.view to open contractor bank details."
        showHomeLink={false}
      />
    );
  }

  const hasAny =
    bank?.bankName ||
    bank?.ifsc ||
    bank?.accountHolderName ||
    bank?.accountNumberLast4 ||
    bank?.accountNumber;

  if (!bank || !hasAny) {
    return (
      <EmptyState
        title="No bank details"
        description="Bank details appear after they are saved on the contractor record."
      />
    );
  }

  const account = resolveAccountDisplay({
    accountNumber: bank.accountNumber,
    accountNumberLast4: bank.accountNumberLast4,
    revealed,
  });

  return (
    <Stack spacing={2} data-testid="contractor-bank-card">
      <Alert severity="info" variant="outlined">
        Account numbers are masked by default. Reveal only when Nest returns a
        decrypted number and you explicitly choose to show it.
      </Alert>

      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Field label="Bank" value={bank.bankName ?? '—'} />
        <Field label="Branch" value={bank.branchName ?? '—'} />
        <Field label="IFSC" value={bank.ifsc ?? '—'} />
        <Field label="Account holder" value={bank.accountHolderName ?? '—'} />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          useFlexGap
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              Account number
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
              data-testid="contractor-account-display"
              data-revealed={account.isRevealed ? 'true' : 'false'}
            >
              {account.display}
            </Typography>
          </Stack>
          {account.canReveal ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRevealed((v) => !v)}
              data-testid="contractor-account-reveal"
            >
              {account.isRevealed ? 'Hide' : 'Reveal'}
            </Button>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Full number not available for your access.
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
