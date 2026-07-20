import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { BankAccountStatus } from '@/bank-accounts/types';
import { useBankAccountsList } from '@/bank-accounts/useBankAccounts';
import { CreateSessionDrawer } from '@/bank-reconciliation/CreateSessionDrawer';
import { resolveBankReconciliationCapabilities } from '@/bank-reconciliation/roleAccess';
import { SessionTable } from '@/bank-reconciliation/SessionTable';
import { useReconciliationSessions } from '@/bank-reconciliation/useBankReconciliation';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';

/**
 * Bank reconciliation sessions — `/accounting/bank-reconciliation` (Micro Phase 054).
 *
 * Nest: `GET/POST /bank-reconciliation/sessions`
 * Permissions: `bank_reconciliation.view` / `bank_reconciliation.manage`
 * Bank picker needs `bank.view`.
 */
export function BankReconciliationPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBankReconciliationCapabilities(hasPermission);
  const navigate = useNavigate();

  const [bankAccountId, setBankAccountId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const canPickBanks = Boolean(access) && hasPermission('bank.view');

  const sessions = useReconciliationSessions(
    { bankAccountId: bankAccountId || undefined },
    canView,
  );
  const banks = useBankAccountsList(
    { status: BankAccountStatus.Active, limit: 100 },
    canView && (caps.canManage || canPickBanks),
  );

  const bankOptions = useMemo(
    () =>
      (banks.data?.items ?? []).map((b) => ({
        id: b.id,
        label: `${b.accountCode} · ${b.bankName} (${b.maskedAccountNumber})`,
      })),
    [banks.data?.items],
  );

  const bankLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bankOptions) {
      map.set(b.id, b.label);
    }
    return map;
  }, [bankOptions]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Bank reconciliation unavailable"
        message="You need the bank_reconciliation.view permission to open bank reconciliation."
      />
    );
  }

  if (sessions.error && isForbiddenError(sessions.error)) {
    return (
      <PermissionDenied
        error={sessions.error}
        title="Bank reconciliation denied"
        message="You do not have permission to load reconciliation sessions."
      />
    );
  }

  const rows = sessions.data ?? [];
  const showEmpty =
    !sessions.isLoading &&
    !sessions.error &&
    rows.length === 0 &&
    !bankAccountId;

  return (
    <Stack spacing={2} data-testid="bank-reconciliation-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Bank Reconciliation</Typography>
          <Typography variant="body2" color="text.secondary">
            Import bank statements, match to book lines, and complete a
            traceable reconciliation session.
          </Typography>
        </Stack>
        {caps.canManage ? (
          <Button
            variant="contained"
            onClick={() => setCreateOpen(true)}
            disabled={!canPickBanks || bankOptions.length === 0}
          >
            New session
          </Button>
        ) : null}
      </Stack>

      {caps.canManage && !canPickBanks ? (
        <Alert severity="warning">
          Creating sessions also needs bank.view to pick a company bank account.
        </Alert>
      ) : null}

      {sessions.error && !isForbiddenError(sessions.error) ? (
        <RetryPanel
          error={sessions.error}
          onRetry={() => void sessions.refetch()}
          forceRetry
        />
      ) : null}

      {showEmpty ? (
        <EmptyState
          title="No reconciliation sessions yet"
          description={
            caps.canManage
              ? 'Create a session for a bank account, import the statement, then match lines.'
              : 'No reconciliation sessions are available for your access.'
          }
          actionLabel={
            caps.canManage && canPickBanks && bankOptions.length > 0
              ? 'New session'
              : undefined
          }
          onAction={
            caps.canManage && canPickBanks && bankOptions.length > 0
              ? () => setCreateOpen(true)
              : undefined
          }
        />
      ) : (
        <SessionTable
          rows={rows}
          loading={sessions.isLoading || sessions.isFetching}
          error={undefined}
          onRetry={() => void sessions.refetch()}
          bankLabel={(id) => bankLabelById.get(id) ?? id}
          onOpen={(row) =>
            void navigate(`/accounting/bank-reconciliation/${row.id}`)
          }
          filterSlot={
            <TextField
              select
              size="small"
              label="Bank account"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              sx={{ minWidth: 260 }}
            >
              <MenuItem value="">All accounts</MenuItem>
              {bankOptions.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.label}
                </MenuItem>
              ))}
            </TextField>
          }
        />
      )}

      <CreateSessionDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bankAccounts={bankOptions}
        onCreated={(sessionId) => {
          void navigate(`/accounting/bank-reconciliation/${sessionId}`);
        }}
      />
    </Stack>
  );
}
