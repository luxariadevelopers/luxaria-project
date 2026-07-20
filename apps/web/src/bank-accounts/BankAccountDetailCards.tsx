import { useState } from 'react';
import {
  Alert,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { formatDate, formatInr } from '@/format';
import { BankAccountStatusChip } from './BankAccountStatusChip';
import { bankAccountTypeLabel } from './labels';
import { resolveBankAccountNumberDisplay } from './masking';
import type { BankBalanceView, PublicCompanyBankAccount } from './types';

type Props = {
  account: PublicCompanyBankAccount;
  balance: BankBalanceView | undefined;
  balanceLoading?: boolean;
  projectLabel: string;
  ledgerLabel: string;
  /** True when Nest may have returned a decrypted number. */
  canViewSensitive: boolean;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" data-testid={`bank-detail-${label}`}>
        {value}
      </Typography>
    </Stack>
  );
}

export function BankAccountDetailCards({
  account,
  balance,
  balanceLoading,
  projectLabel,
  ledgerLabel,
  canViewSensitive,
}: Props) {
  const [revealed, setRevealed] = useState(false);
  const accountDisplay = resolveBankAccountNumberDisplay({
    maskedAccountNumber: account.maskedAccountNumber,
    accountNumber: account.accountNumber,
    revealed,
  });

  return (
    <Stack spacing={2} data-testid="bank-account-detail-cards">
      <Alert severity="info" variant="outlined">
        Account numbers stay masked by default. Nest returns the full number
        only with <strong>bank.view_sensitive</strong> or{' '}
        <strong>bank.manage</strong>. List APIs never expose full numbers.
      </Alert>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <Stack
          spacing={1.5}
          sx={{
            flex: 1,
            minWidth: 260,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="subtitle1">Account</Typography>
            <BankAccountStatusChip status={account.status} />
          </Stack>
          <Field label="Code" value={account.accountCode} />
          <Field label="Bank" value={account.bankName} />
          <Field label="Branch" value={account.branch ?? '—'} />
          <Field label="Holder" value={account.accountHolderName} />
          <Field label="IFSC" value={account.ifsc} />
          <Field
            label="Type"
            value={bankAccountTypeLabel(account.accountType)}
          />
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              Account number
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Typography
                variant="body2"
                sx={{ fontFamily: 'ui-monospace, monospace' }}
                data-testid="bank-detail-Account number"
              >
                {accountDisplay.display}
              </Typography>
              {canViewSensitive && accountDisplay.canReveal ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setRevealed((v) => !v)}
                  data-testid="bank-reveal-account"
                >
                  {accountDisplay.isRevealed ? 'Hide' : 'Reveal'}
                </Button>
              ) : null}
            </Stack>
          </Stack>
          <Field label="Scope" value={projectLabel} />
          <Field label="Ledger" value={ledgerLabel} />
          <Field
            label="Default"
            value={account.isDefault ? 'Yes' : 'No'}
          />
        </Stack>

        <Stack
          spacing={1.5}
          sx={{
            flex: 1,
            minWidth: 260,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle1">Balance</Typography>
          {balanceLoading && !balance ? (
            <Typography variant="body2" color="text.secondary">
              Loading balance…
            </Typography>
          ) : balance ? (
            <>
              <Field
                label="Opening"
                value={formatInr(balance.openingBalance)}
              />
              <Field
                label="Total debit"
                value={formatInr(balance.totalDebit)}
              />
              <Field
                label="Total credit"
                value={formatInr(balance.totalCredit)}
              />
              <Field
                label="Current balance"
                value={formatInr(balance.currentBalance)}
              />
              <Field
                label="As of"
                value={formatDate(balance.asOf)}
              />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Balance unavailable
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
