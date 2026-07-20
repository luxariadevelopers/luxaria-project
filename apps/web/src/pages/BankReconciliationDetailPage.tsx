import { useMemo, useState } from 'react';
import type { GridRowSelectionModel } from '@mui/x-data-grid';
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ImportWizard } from '@/bank-reconciliation/ImportWizard';
import { MatchingGrid } from '@/bank-reconciliation/MatchingGrid';
import { ReconciliationSummary } from '@/bank-reconciliation/ReconciliationSummary';
import { resolveBankReconciliationCapabilities } from '@/bank-reconciliation/roleAccess';
import {
  BankReconciliationSessionStatus,
  type PublicBankReconciliationMatch,
} from '@/bank-reconciliation/types';
import { bookKey, UnmatchedPanels } from '@/bank-reconciliation/UnmatchedPanels';
import {
  useAutoMatch,
  useCompleteSession,
  useManualMatch,
  useMatches,
  useReconciliationSession,
  useReconciliationStatement,
  useUnmatch,
  useUnmatched,
} from '@/bank-reconciliation/useBankReconciliation';
import {
  validateManualMatchAmounts,
} from '@/bank-reconciliation/validation';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';

const EMPTY_SELECTION: GridRowSelectionModel = {
  type: 'include',
  ids: new Set(),
};

function selectedIds(model: GridRowSelectionModel): string[] {
  if (model.type !== 'include') return [];
  return [...model.ids].map(String);
}

/**
 * Bank reconciliation session detail —
 * `/accounting/bank-reconciliation/:sessionId` (Micro Phase 054).
 *
 * Nest: import, unmatched, auto/manual match, unmatch, statement, complete.
 */
export function BankReconciliationDetailPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveBankReconciliationCapabilities(hasPermission);
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotify();

  const [statementSelection, setStatementSelection] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION);
  const [bookSelection, setBookSelection] =
    useState<GridRowSelectionModel>(EMPTY_SELECTION);
  const [matchNotes, setMatchNotes] = useState('');
  const [dateToleranceDays, setDateToleranceDays] = useState(3);
  const [completeOpen, setCompleteOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;

  const sessionQuery = useReconciliationSession(sessionId || null, canView);
  const session = sessionQuery.data;
  const editable =
    session != null &&
    session.status !== BankReconciliationSessionStatus.Completed &&
    session.status !== BankReconciliationSessionStatus.Cancelled;

  const unmatchedQuery = useUnmatched(
    sessionId || null,
    canView && Boolean(session),
  );
  const matchesQuery = useMatches(
    sessionId || null,
    canView && Boolean(session),
  );
  const statementQuery = useReconciliationStatement(
    sessionId || null,
    canView && Boolean(session),
  );

  const autoMatch = useAutoMatch(sessionId);
  const manualMatch = useManualMatch(sessionId);
  const unmatch = useUnmatch(sessionId);
  const complete = useCompleteSession(sessionId);

  const statementLines = useMemo(
    () => unmatchedQuery.data?.statementLines ?? [],
    [unmatchedQuery.data?.statementLines],
  );
  const bookLines = useMemo(
    () => unmatchedQuery.data?.bookLines ?? [],
    [unmatchedQuery.data?.bookLines],
  );

  const selectedStatement = useMemo(() => {
    const ids = new Set(selectedIds(statementSelection));
    return statementLines.filter((l) => ids.has(l.id));
  }, [statementLines, statementSelection]);

  const selectedBook = useMemo(() => {
    const ids = new Set(selectedIds(bookSelection));
    return bookLines.filter((l) => ids.has(bookKey(l)));
  }, [bookLines, bookSelection]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Bank reconciliation unavailable"
        message="You need the bank_reconciliation.view permission to open this session."
      />
    );
  }

  if (sessionQuery.error && isForbiddenError(sessionQuery.error)) {
    return (
      <PermissionDenied
        error={sessionQuery.error}
        title="Session denied"
        message="You do not have permission to view this reconciliation session."
      />
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <Stack
        spacing={2}
        sx={{ alignItems: 'center', py: 8 }}
        data-testid="bank-reconciliation-detail-loading"
      >
        <CircularProgress size={32} />
        <Typography color="text.secondary">Loading session…</Typography>
      </Stack>
    );
  }

  if (sessionQuery.error) {
    return (
      <RetryPanel
        error={sessionQuery.error}
        onRetry={() => void sessionQuery.refetch()}
        forceRetry
      />
    );
  }

  if (!session) {
    return (
      <EmptyState
        title="Session not found"
        description="This reconciliation session is unavailable or was removed."
        actionLabel="Back to sessions"
        onAction={() => void navigate('/accounting/bank-reconciliation')}
      />
    );
  }

  const clearSelections = () => {
    setStatementSelection(EMPTY_SELECTION);
    setBookSelection(EMPTY_SELECTION);
    setMatchNotes('');
  };

  const runAutoMatch = async () => {
    try {
      const result = await autoMatch.mutateAsync({
        dateToleranceDays,
      });
      success(`Auto-match created ${result.matchCount} match(es)`);
      clearSelections();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const runManualMatch = async () => {
    const amountCheck = validateManualMatchAmounts(
      selectedStatement,
      selectedBook,
    );
    if (!amountCheck.ok) {
      notifyError(amountCheck.message);
      return;
    }
    try {
      await manualMatch.mutateAsync({
        statementLineIds: selectedStatement.map((l) => l.id),
        bookLines: selectedBook.map((b) => ({
          journalId: b.journalId,
          journalLineId: b.journalLineId,
        })),
        notes: matchNotes.trim() || undefined,
      });
      success('Manual match saved');
      clearSelections();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const runUnmatch = async (match: PublicBankReconciliationMatch) => {
    try {
      await unmatch.mutateAsync(match.id);
      success('Match undone (audit trail retained)');
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const runComplete = async () => {
    try {
      await complete.mutateAsync();
      success('Reconciliation session completed');
      setCompleteOpen(false);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const difference = statementQuery.data?.difference;
  const reconciled = statementQuery.data?.reconciled;

  return (
    <Stack spacing={2.5} data-testid="bank-reconciliation-detail-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Button
          size="small"
          onClick={() => void navigate('/accounting/bank-reconciliation')}
        >
          ← Sessions
        </Button>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          {caps.canMatch && editable ? (
            <>
              <TextField
                size="small"
                type="number"
                label="Date tolerance (days)"
                value={dateToleranceDays}
                onChange={(e) =>
                  setDateToleranceDays(
                    Math.max(0, Number(e.target.value) || 0),
                  )
                }
                sx={{ width: 160 }}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <Button
                variant="outlined"
                onClick={() => void runAutoMatch()}
                disabled={autoMatch.isPending}
              >
                Auto-match
              </Button>
              <Button
                variant="contained"
                onClick={() => void runManualMatch()}
                disabled={
                  manualMatch.isPending ||
                  selectedStatement.length === 0 ||
                  selectedBook.length === 0
                }
              >
                Match selected
              </Button>
            </>
          ) : null}
          {caps.canFinalise && editable ? (
            <Button
              variant="contained"
              color="success"
              onClick={() => setCompleteOpen(true)}
              disabled={complete.isPending || (session.lineCount ?? 0) === 0}
            >
              Complete
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <ReconciliationSummary
        session={session}
        statement={statementQuery.data}
        loading={statementQuery.isLoading || statementQuery.isFetching}
      />

      {statementQuery.error && !isForbiddenError(statementQuery.error) ? (
        <RetryPanel
          error={statementQuery.error}
          onRetry={() => void statementQuery.refetch()}
          forceRetry
        />
      ) : null}

      {!editable ? (
        <Alert severity="info">
          This session is {session.status.replace(/_/g, ' ')} and is
          read-only.
        </Alert>
      ) : null}

      {caps.canImport && editable ? (
        <ImportWizard
          sessionId={session.id}
          existingLineCount={session.lineCount ?? 0}
          savedMapping={session.columnMapping}
          onImported={clearSelections}
        />
      ) : null}

      {!caps.canImport && editable ? (
        <Alert severity="warning">
          Statement import requires bank_reconciliation.import.
        </Alert>
      ) : null}

      {caps.canMatch && editable && selectedStatement.length + selectedBook.length > 0 ? (
        <TextField
          size="small"
          label="Match notes (optional)"
          value={matchNotes}
          onChange={(e) => setMatchNotes(e.target.value)}
          fullWidth
        />
      ) : null}

      {unmatchedQuery.error && !isForbiddenError(unmatchedQuery.error) ? (
        <RetryPanel
          error={unmatchedQuery.error}
          onRetry={() => void unmatchedQuery.refetch()}
          forceRetry
        />
      ) : (
        <UnmatchedPanels
          statementLines={statementLines}
          bookLines={bookLines}
          loading={unmatchedQuery.isLoading || unmatchedQuery.isFetching}
          statementSelection={statementSelection}
          bookSelection={bookSelection}
          onStatementSelectionChange={setStatementSelection}
          onBookSelectionChange={setBookSelection}
          selectable={caps.canMatch && editable}
        />
      )}

      <MatchingGrid
        matches={matchesQuery.data ?? []}
        loading={matchesQuery.isLoading || matchesQuery.isFetching}
        canUnmatch={caps.canMatch && editable}
        onUnmatch={(m) => void runUnmatch(m)}
      />

      <ConfirmDialog
        open={completeOpen}
        title="Complete reconciliation?"
        description={
          reconciled
            ? 'Adjusted bank and book balances match. The session will be marked completed.'
            : `Outstanding difference ${formatInr(difference ?? 0)}. Nest allows completion with a difference; the audit trail will record it.`
        }
        confirmLabel="Complete session"
        loading={complete.isPending}
        onConfirm={() => void runComplete()}
        onCancel={() => setCompleteOpen(false)}
      />
    </Stack>
  );
}
