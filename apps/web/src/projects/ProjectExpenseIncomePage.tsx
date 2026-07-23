import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DetailHeader, SummaryCards } from '@/components/entity-detail';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DirectorStatus } from '@/directors/types';
import { useDirectorsList } from '@/directors/useDirectors';
import { formatDate, formatInr } from '@/format';
import { fetchJournal } from '@/journals/api';
import { journalsKeys } from '@/journals/queryKeys';
import { resolveJournalCapabilities } from '@/journals/roleAccess';
import type { PublicJournalEntry } from '@/journals/types';
import { useJournalDetail } from '@/journals/useJournals';
import {
  useBookFinancialYears,
  useCashBankBook,
} from '@/reports/accounting/useCashBankBook';
import { CASH_BANK_BOOK_VIEW_PERMISSION } from '@/reports/accounting/permissions';
import { ProjectFinanceEntryDrawer } from './ProjectFinanceEntryDrawer';
import {
  consolidateTransferFinanceRows,
  expandShareCapitalByDirector,
  financeRowTypeLabel,
  financeRowVoucherLabel,
  mapBookRowsToFinanceRows,
  mergeProjectFinanceRows,
  summariseFinanceRows,
  type ProjectFinanceEntryKind,
  type ProjectFinanceRow,
} from './projectExpenseIncome';
import { useProjectDetail } from './useProjects';

type Props = {
  projectId?: string;
};

type FilterKind = 'all' | 'income' | 'expense' | 'transfer';

/**
 * Project bank/cash income & expense register — `/projects/:projectId/expense-income`.
 *
 * Uses cash/bank books scoped to the project. Entry posts via journals from
 * company bank/cash (not site petty cash).
 */
export function ProjectExpenseIncomePage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const journalCaps = resolveJournalCapabilities(hasPermission);
  const { info } = useNotify();

  const canViewProject = Boolean(access) && hasPermission('project.view');
  const canViewBooks = hasPermission(CASH_BANK_BOOK_VIEW_PERMISSION);
  const canView = canViewProject && canViewBooks;
  const canCorrect =
    journalCaps.canCreate && journalCaps.canReverse;

  const detailQuery = useProjectDetail(projectId, canViewProject);
  const project = detailQuery.data;

  const fyQuery = useBookFinancialYears(canView);
  const currentFyId =
    fyQuery.data?.find((fy) => fy.isCurrent)?.id ?? fyQuery.data?.[0]?.id ?? '';

  const [filterKind, setFilterKind] = useState<FilterKind>('all');
  const [entryKind, setEntryKind] = useState<ProjectFinanceEntryKind | null>(
    null,
  );
  const [correctRow, setCorrectRow] = useState<ProjectFinanceRow | null>(null);

  const correctJournalQuery = useJournalDetail(
    correctRow?.journalId,
    Boolean(correctRow?.journalId) && canCorrect && !correctRow?.isCompanyCapital,
  );

  const bookQuery = useMemo(
    () => ({
      projectId: projectId || undefined,
      financialYearId: currentFyId || undefined,
    }),
    [projectId, currentFyId],
  );

  /** Company bank book (no project filter) — share capital lives here. */
  const companyBankQuery = useMemo(
    () => ({
      financialYearId: currentFyId || undefined,
    }),
    [currentFyId],
  );

  const bankBook = useCashBankBook(
    'bank-book',
    bookQuery,
    canView && Boolean(projectId) && Boolean(currentFyId),
  );
  const cashBook = useCashBankBook(
    'cash-book',
    bookQuery,
    canView && Boolean(projectId) && Boolean(currentFyId),
  );
  const companyBankBook = useCashBankBook(
    'bank-book',
    companyBankQuery,
    canView && Boolean(currentFyId),
  );

  const companyCapitalBankRows = useMemo(
    () =>
      mapBookRowsToFinanceRows(companyBankBook.data?.rows ?? [], 'bank', {
        includeCompanyCapitalOnly: true,
      }),
    [companyBankBook.data?.rows],
  );

  const capitalJournalIds = useMemo(
    () =>
      [
        ...new Set(
          companyCapitalBankRows.map((row) => row.journalId).filter(Boolean),
        ),
      ].sort(),
    [companyCapitalBankRows],
  );

  const canViewDirectors = hasPermission('director.view');
  const directorsQuery = useDirectorsList(
    { page: 1, limit: 100, status: DirectorStatus.Active },
    canView && canViewDirectors && capitalJournalIds.length > 0,
  );

  const capitalJournalQueries = useQueries({
    queries: capitalJournalIds.map((journalId) => ({
      queryKey: journalsKeys.detail(journalId),
      queryFn: () => fetchJournal(journalId),
      enabled: canView && Boolean(journalId),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const capitalJournalData = capitalJournalQueries
    .map((q) => q.data)
    .filter((j): j is PublicJournalEntry => Boolean(j));

  const journalsById = useMemo(() => {
    const map = new Map<string, PublicJournalEntry>();
    for (const journal of capitalJournalData) {
      map.set(journal.id, journal);
    }
    return map;
  }, [capitalJournalData]);

  const directorNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of directorsQuery.data?.items ?? []) {
      map.set(d.id, d.fullName);
    }
    return map;
  }, [directorsQuery.data?.items]);

  const allRows = useMemo(() => {
    const projectBank = mapBookRowsToFinanceRows(
      bankBook.data?.rows ?? [],
      'bank',
      { excludeCompanyCapital: true },
    );
    const projectCash = mapBookRowsToFinanceRows(
      cashBook.data?.rows ?? [],
      'cash',
      { excludeCompanyCapital: true },
    );
    const companyCapital = expandShareCapitalByDirector(
      companyCapitalBankRows,
      journalsById,
      directorNamesById,
    );
    return consolidateTransferFinanceRows(
      mergeProjectFinanceRows(companyCapital, projectBank, projectCash),
    );
  }, [
    bankBook.data?.rows,
    cashBook.data?.rows,
    companyCapitalBankRows,
    journalsById,
    directorNamesById,
  ]);

  const rows = useMemo(() => {
    if (filterKind === 'all') return allRows;
    return allRows.filter((row) => row.kind === filterKind);
  }, [allRows, filterKind]);

  const totals = useMemo(() => summariseFinanceRows(rows), [rows]);
  const allTotals = useMemo(
    () => summariseFinanceRows(allRows),
    [allRows],
  );

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!canViewProject || (detailQuery.error && isForbiddenError(detailQuery.error))) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Project unavailable"
        message="You need project.view and access to this project."
      />
    );
  }

  if (!canViewBooks) {
    return (
      <PermissionDenied
        title="Expense & income unavailable"
        message={`Requires \`${CASH_BANK_BOOK_VIEW_PERMISSION}\` to read bank/cash books for this project.`}
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="The project may have been removed or the id is invalid."
      />
    );
  }

  const capitalJournalsLoading = capitalJournalQueries.some((q) => q.isLoading);
  const capitalJournalsError = capitalJournalQueries.find((q) => q.error)?.error;
  const loading =
    fyQuery.isLoading ||
    bankBook.isLoading ||
    cashBook.isLoading ||
    companyBankBook.isLoading ||
    capitalJournalsLoading ||
    (canViewDirectors &&
      capitalJournalIds.length > 0 &&
      directorsQuery.isLoading);
  const error =
    fyQuery.error ||
    bankBook.error ||
    cashBook.error ||
    companyBankBook.error ||
    capitalJournalsError ||
    (canViewDirectors ? directorsQuery.error : null);

  return (
    <Stack spacing={2} data-testid="project-expense-income-page">
      <DetailHeader
        title="Expense & income"
        code={project.projectCode}
        subtitle={project.projectName}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <Typography color="text.secondary">
        Record and review money in/out of this project from the company{' '}
        <strong>bank book</strong> and <strong>cash book</strong>. Site petty
        cash for the engineer is separate — fund it via Petty Cash → Fund
        Transfers, then site expenses are reported against that float.
      </Typography>

      <Alert severity="info" variant="outlined">
        <strong>Capital income</strong> is listed per director (share capital
        into the company bank). Post it under Capital → Shareholding if missing.
        Use <strong>Add income</strong> for director loans into the project,
        sales, and other receipts. Use <strong>Add expense</strong> for project
        costs; <strong>Repay … loan (principal)</strong> to repay capital;{' '}
        <strong>Interest paid</strong> when only interest goes to a director,
        investor, or lender. Share ownership / splits are under{' '}
        <strong>Capital → Shareholding</strong>. Use <strong>Transfer</strong>{' '}
        to move money between bank and cash in one voucher.
      </Alert>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {journalCaps.canCreate ? (
          <>
            <Button variant="contained" onClick={() => setEntryKind('income')}>
              Add income
            </Button>
            <Button variant="outlined" onClick={() => setEntryKind('expense')}>
              Add expense
            </Button>
            <Button variant="outlined" onClick={() => setEntryKind('transfer')}>
              Transfer
            </Button>
          </>
        ) : (
          <Alert severity="info" sx={{ flex: 1 }}>
            Viewing only — journal.create is required to add bank/cash income,
            expense, or transfer.
          </Alert>
        )}
        <Button
          component={RouterLink}
          to="/accounting/petty-cash/transfers"
          variant="text"
        >
          Fund site petty cash
        </Button>
        <Button
          component={RouterLink}
          to="/reports/accounting/bank-book"
          variant="text"
        >
          Open bank book
        </Button>
      </Stack>

      <SummaryCards
        fields={[
          {
            id: 'income',
            label: 'Income (bank/cash)',
            value: formatInr(allTotals.income),
          },
          {
            id: 'expense',
            label: 'Expense (bank/cash)',
            value: formatInr(allTotals.expense),
          },
          {
            id: 'net',
            label: 'Net',
            value: formatInr(allTotals.net),
          },
        ]}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="finance-filter-kind">Show</InputLabel>
          <Select
            labelId="finance-filter-kind"
            label="Show"
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value as FilterKind)}
          >
            <MenuItem value="all">All movements</MenuItem>
            <MenuItem value="income">Income only</MenuItem>
            <MenuItem value="expense">Expense only</MenuItem>
            <MenuItem value="transfer">Transfers only</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {filterKind === 'transfer'
            ? `Transfers: ${rows.length}`
            : `Filtered total: ${formatInr(totals.income)} in / ${formatInr(totals.expense)} out`}
        </Typography>
      </Stack>

      {error ? (
        <RetryPanel
          error={error}
          onRetry={() => {
            void fyQuery.refetch();
            void bankBook.refetch();
            void cashBook.refetch();
            void companyBankBook.refetch();
            void directorsQuery.refetch();
            for (const q of capitalJournalQueries) void q.refetch();
          }}
        />
      ) : null}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <EmptyState
              title="No bank/cash movements yet"
              description="Post director share capital under Capital → Shareholding, or add project income/expense from bank/cash. Petty cash site vouchers do not appear here."
            />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Book</TableCell>
                <TableCell>Ref. / Voucher</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Narration</TableCell>
                <TableCell align="right">Amount</TableCell>
                {canCorrect ? (
                  <TableCell align="right">Actions</TableCell>
                ) : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const voucherLabel = financeRowVoucherLabel(row);
                return (
                <TableRow key={row.id} hover>
                  <TableCell>{formatDate(row.journalDate)}</TableCell>
                  <TableCell>{financeRowTypeLabel(row)}</TableCell>
                  <TableCell>
                    {row.kind === 'transfer' && row.fromBook && row.toBook
                      ? `${row.fromBook === 'bank' ? 'Bank' : 'Cash'} → ${
                          row.toBook === 'bank' ? 'Bank' : 'Cash'
                        }`
                      : row.book === 'bank'
                        ? 'Bank'
                        : 'Cash'}
                  </TableCell>
                  <TableCell>
                    {voucherLabel ? (
                      <Button
                        component={RouterLink}
                        to={`/accounting/journals/${row.journalId}`}
                        size="small"
                        sx={{ textTransform: 'none', px: 0 }}
                      >
                        {voucherLabel}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {row.accountCode} · {row.accountName}
                  </TableCell>
                  <TableCell>
                    {row.isCompanyCapital && row.directorName
                      ? `Capital income — ${row.directorName}`
                      : row.description || row.narration || '—'}
                  </TableCell>
                  <TableCell align="right">{formatInr(row.amount)}</TableCell>
                  {canCorrect ? (
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => {
                          if (row.isCompanyCapital) {
                            info(
                              'Share capital is edited under Capital → Shareholding, not here.',
                            );
                            return;
                          }
                          setEntryKind(null);
                          setCorrectRow(row);
                        }}
                        data-testid={`edit-finance-${row.journalId}`}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {projectId && entryKind && !correctRow ? (
        <ProjectFinanceEntryDrawer
          open={Boolean(entryKind)}
          onClose={() => setEntryKind(null)}
          projectId={projectId}
          projectName={project.projectName}
          projectCode={project.projectCode}
          kind={entryKind}
          defaultBankAccountId={project.defaultBankAccount}
        />
      ) : null}

      {projectId && correctRow && correctJournalQuery.data ? (
        <ProjectFinanceEntryDrawer
          open
          onClose={() => setCorrectRow(null)}
          projectId={projectId}
          projectName={project.projectName}
          projectCode={project.projectCode}
          kind={correctRow.kind}
          defaultBankAccountId={project.defaultBankAccount}
          correctFrom={{
            journal: correctJournalQuery.data,
            row: correctRow,
          }}
        />
      ) : null}

      {correctRow &&
      !correctRow.isCompanyCapital &&
      correctJournalQuery.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : null}
    </Stack>
  );
}
