import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { fetchCompanyBankAccount } from '@/bank-accounts/api';
import { fetchAccount, fetchAccounts } from '@/chart-of-accounts/api';
import { QuickCreateExpenseAccountDialog } from '@/chart-of-accounts/QuickCreateExpenseAccountDialog';
import {
  AccountCategory,
  AccountStatus,
  AccountType,
  type PublicAccount,
} from '@/chart-of-accounts/types';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { QuickCreateCostCentreDialog } from '@/cost-centres/QuickCreateCostCentreDialog';
import {
  CostCentreKind,
  CostCentreStatus,
  type CostCentreListRow,
} from '@/cost-centres/types';
import { useCostCentresList } from '@/cost-centres/useCostCentres';
import { costCentresKeys } from '@/cost-centres/queryKeys';
import { fetchCustomers } from '@/customers/api';
import { fetchDirectors } from '@/directors/api';
import { DirectorStatus } from '@/directors/types';
import { formatInrInWords } from '@/format';
import { fetchInvestors } from '@/investors/api';
import { InvestorStatus } from '@/investors/types';
import { resolveJournalCapabilities } from '@/journals/roleAccess';
import {
  JournalFundingSource,
  JournalPartyType,
  type PublicJournalEntry,
} from '@/journals/types';
import {
  useAmendJournal,
  useCreateJournal,
  useSubmitJournal,
} from '@/journals/useJournals';
import { cashBankBookQueryKeys } from '@/reports/accounting/queryKeys';
import {
  buildProjectFinanceJournal,
  buildProjectTransferJournal,
  expenseAccountOptionLabel,
  formatExternalLoanNarration,
  incomeAccountOptionLabel,
  paymentNarrationPart,
  prefillFromFinanceJournal,
  resolveExpenseFundingSource,
  resolveIncomeFundingSource,
  resolveIncomePartyType,
  type ProjectCashBookKind,
  type ProjectFinanceEntryKind,
  type ProjectFinanceFormPrefill,
  type ProjectFinanceRow,
} from './projectExpenseIncome';

function isBankPaymentMode(
  mode: string | undefined,
): mode is 'cheque' | 'account_transfer' | 'upi' | 'cash_withdrawal' {
  return (
    mode === 'cheque' ||
    mode === 'account_transfer' ||
    mode === 'upi' ||
    mode === 'cash_withdrawal'
  );
}

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

const formSchema = z.object({
  journalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  bookKind: z.enum(['bank', 'cash']),
  toBookKind: z.enum(['bank', 'cash']),
  bookAccountId: z
    .string()
    .regex(OBJECT_ID_RE, 'Select bank or cash account'),
  contraAccountId: z
    .string()
    .regex(OBJECT_ID_RE, 'Select where the money is from / goes to'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  narration: z.string().trim().min(1, 'Narration is required').max(500),
  customerId: z.string().optional().or(z.literal('')),
  directorId: z.string().optional().or(z.literal('')),
  investorId: z.string().optional().or(z.literal('')),
  loanSecurity: z.enum(['', 'secured', 'unsecured']).optional(),
  loanFrom: z.enum(['', 'bank', 'third_party']).optional(),
  loanLenderName: z.string().optional().or(z.literal('')),
  loanHasInterest: z.enum(['', 'yes', 'no']).optional(),
  loanInterestRate: z.coerce.number().min(0).max(100).optional(),
  paymentMode: z
    .enum(['', 'cheque', 'account_transfer', 'upi', 'cash_withdrawal'])
    .optional(),
  paymentReference: z.string().optional().or(z.literal('')),
  incomeSource: z.string().optional().or(z.literal('')),
  /** Who receives interest when posting Interest Expense. */
  interestPayee: z.enum(['', 'director', 'investor', 'external']).optional(),
  /** Optional spend tag for analysis (e.g. Footing). */
  costCentreId: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  projectCode?: string;
  kind: ProjectFinanceEntryKind;
  /** Company bank account id from project.defaultBankAccount (resolved to ledger). */
  defaultBankAccountId?: string | null;
  /**
   * When set, drawer opens as Edit: form is prefilled and save amends the
   * posted journal in place (same voucher number).
   */
  correctFrom?: {
    journal: PublicJournalEntry;
    row: ProjectFinanceRow;
  } | null;
};

function applicableCostCentres(
  rows: CostCentreListRow[],
  projectId: string,
): CostCentreListRow[] {
  return rows.filter((row) => !row.projectId || row.projectId === projectId);
}

const INCOME_CATEGORIES: AccountCategory[] = [
  AccountCategory.Loan,
  AccountCategory.DirectorAccount,
  AccountCategory.InvestorAccount,
  AccountCategory.Sales,
  AccountCategory.OtherIncome,
];

const EXPENSE_CATEGORIES: AccountCategory[] = [
  AccountCategory.DirectorAccount,
  AccountCategory.InvestorAccount,
  AccountCategory.Loan,
  AccountCategory.Interest,
  AccountCategory.LandCost,
  AccountCategory.MaterialPurchase,
  AccountCategory.DirectExpense,
  AccountCategory.IndirectExpense,
  AccountCategory.WorkInProgress,
];

function findAccount(
  accounts: readonly PublicAccount[] | undefined,
  id: string,
): PublicAccount | undefined {
  return accounts?.find((row) => row.id === id);
}

/** Keep a prefilled/selected value selectable while option lists are loading. */
function withSelectOption(
  options: { value: string; label: string }[],
  value: string | undefined | null,
  label: string,
): { value: string; label: string }[] {
  const id = value?.trim();
  if (!id || options.some((opt) => opt.value === id)) {
    return options;
  }
  return [{ value: id, label }, ...options];
}

function emptyFormDefaults(
  kind: ProjectFinanceEntryKind,
): FormValues {
  return {
    journalDate: new Date().toISOString().slice(0, 10),
    bookKind: 'bank',
    toBookKind: 'cash',
    bookAccountId: '',
    contraAccountId: '',
    amount: 0.01,
    narration:
      kind === 'income'
        ? 'Project bank/cash income'
        : kind === 'transfer'
          ? 'Project bank/cash transfer'
          : 'Project bank/cash expense',
    customerId: '',
    directorId: '',
    investorId: '',
    loanSecurity: '',
    loanFrom: '',
    loanLenderName: '',
    loanHasInterest: '',
    loanInterestRate: undefined,
    paymentMode: '',
    paymentReference: '',
    incomeSource: '',
    interestPayee: '',
    costCentreId: '',
  };
}

function formValuesFromPrefill(prefill: ProjectFinanceFormPrefill): FormValues {
  return {
    journalDate: prefill.journalDate,
    bookKind: prefill.bookKind,
    toBookKind: prefill.toBookKind,
    bookAccountId: prefill.bookAccountId,
    contraAccountId: prefill.contraAccountId,
    amount: prefill.amount,
    narration: prefill.narration,
    customerId: prefill.customerId,
    directorId: prefill.directorId,
    investorId: prefill.investorId,
    loanSecurity: prefill.loanSecurity,
    loanFrom: prefill.loanFrom,
    loanLenderName: prefill.loanLenderName,
    loanHasInterest: prefill.loanHasInterest,
    loanInterestRate: prefill.loanInterestRate,
    paymentMode: prefill.paymentMode,
    paymentReference: prefill.paymentReference,
    incomeSource: prefill.incomeSource,
    interestPayee: prefill.directorId
      ? 'director'
      : prefill.investorId
        ? 'investor'
        : '',
    costCentreId: prefill.costCentreId,
  };
}

export function ProjectFinanceEntryDrawer({
  open,
  onClose,
  projectId,
  projectName,
  projectCode,
  kind,
  defaultBankAccountId,
  correctFrom = null,
}: Props) {
  const { hasPermission } = useAuth();
  const caps = resolveJournalCapabilities(hasPermission);
  const create = useCreateJournal();
  const submit = useSubmitJournal();
  const amend = useAmendJournal();
  const qc = useQueryClient();
  const { success, error: notifyError } = useNotify();
  const isCorrecting = Boolean(correctFrom?.journal);
  const canManageAccounts = hasPermission('account.manage');
  const canViewCostCentres = hasPermission('cost_centre.view');
  const canManageCostCentres = hasPermission('cost_centre.manage');
  const [createExpenseAccountOpen, setCreateExpenseAccountOpen] =
    useState(false);
  const [createCostCentreOpen, setCreateCostCentreOpen] = useState(false);

  const { control, handleSubmit, reset, setValue, getValues, watch } =
    useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyFormDefaults(kind),
  });

  const bookKind = watch('bookKind') as ProjectCashBookKind;
  const toBookKind = watch('toBookKind') as ProjectCashBookKind;
  const bookAccountId = watch('bookAccountId');
  const contraAccountId = watch('contraAccountId');
  const directorId = watch('directorId');
  const investorId = watch('investorId');
  const customerId = watch('customerId');
  const amount = watch('amount');
  const loanSecurity = watch('loanSecurity');
  const loanFrom = watch('loanFrom');
  const loanHasInterest = watch('loanHasInterest');
  const loanInterestRate = watch('loanInterestRate');
  const paymentMode = watch('paymentMode');
  const paymentReference = watch('paymentReference');
  const interestPayee = watch('interestPayee');
  const incomeSource = watch('incomeSource');
  const costCentreId = watch('costCentreId');
  const isTransfer = kind === 'transfer';

  const amountInWords = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return '';
    return formatInrInWords(n, { empty: '' });
  }, [amount]);

  const defaultBankLedgerQuery = useQuery({
    queryKey: [
      'project-finance',
      'default-bank-ledger',
      defaultBankAccountId ?? '',
    ],
    queryFn: async () => {
      const bank = await fetchCompanyBankAccount(defaultBankAccountId!);
      return bank.ledgerAccountId ?? null;
    },
    enabled: open && Boolean(defaultBankAccountId) && hasPermission('bank.view'),
    staleTime: 60_000,
    retry: false,
  });

  const bookAccountsQuery = useQuery({
    queryKey: ['project-finance', 'book-accounts', bookKind, open],
    queryFn: async () => {
      if (bookKind === 'bank') {
        return fetchAccounts({
          page: 1,
          limit: 100,
          status: AccountStatus.Active,
          accountCategory: AccountCategory.Bank,
        });
      }
      return fetchAccounts({
        page: 1,
        limit: 100,
        status: AccountStatus.Active,
        accountCategory: AccountCategory.Cash,
      });
    },
    enabled: open && hasPermission('account.view'),
    staleTime: 30_000,
    retry: false,
  });

  const toBookAccountsQuery = useQuery({
    queryKey: ['project-finance', 'to-book-accounts', toBookKind, open],
    queryFn: async () => {
      if (toBookKind === 'bank') {
        return fetchAccounts({
          page: 1,
          limit: 100,
          status: AccountStatus.Active,
          accountCategory: AccountCategory.Bank,
        });
      }
      return fetchAccounts({
        page: 1,
        limit: 100,
        status: AccountStatus.Active,
        accountCategory: AccountCategory.Cash,
      });
    },
    enabled: open && isTransfer && hasPermission('account.view'),
    staleTime: 30_000,
    retry: false,
  });

  const contraQuery = useQuery({
    queryKey: ['project-finance', 'contra', kind, open],
    queryFn: async () => {
      const categories =
        kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      const batches = await Promise.all(
        categories.map((accountCategory) =>
          fetchAccounts({
            page: 1,
            limit: 100,
            status: AccountStatus.Active,
            accountCategory,
          }),
        ),
      );
      const byId = new Map(
        batches.flat().map((row) => [row.id, row] as const),
      );
      return [...byId.values()]
        .filter((row) => {
          if (!row.allowManualPosting || row.isControlAccount) return false;
          // Interest category is shared by income (4300) and expense (5400).
          if (row.accountCategory === AccountCategory.Interest) {
            return kind === 'expense'
              ? row.accountType === AccountType.Expense
              : row.accountType === AccountType.Income;
          }
          return true;
        })
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    },
    enabled: open && !isTransfer && hasPermission('account.view'),
    staleTime: 30_000,
    retry: false,
  });

  const costCentresQuery = useCostCentresList(
    {
      page: 1,
      limit: 100,
      kind: CostCentreKind.CostCentre,
      status: CostCentreStatus.Active,
    },
    open && kind === 'expense' && canViewCostCentres,
  );

  const pinnedBookQuery = useQuery({
    queryKey: ['project-finance', 'pinned-book', bookAccountId],
    queryFn: () => fetchAccount(bookAccountId),
    enabled:
      open &&
      isCorrecting &&
      OBJECT_ID_RE.test(bookAccountId) &&
      hasPermission('account.view') &&
      !(bookAccountsQuery.data ?? []).some((row) => row.id === bookAccountId),
    staleTime: 60_000,
    retry: false,
  });

  const pinnedContraQuery = useQuery({
    queryKey: ['project-finance', 'pinned-contra', contraAccountId],
    queryFn: () => fetchAccount(contraAccountId),
    enabled:
      open &&
      isCorrecting &&
      OBJECT_ID_RE.test(contraAccountId) &&
      hasPermission('account.view') &&
      !(contraQuery.data ?? []).some((row) => row.id === contraAccountId) &&
      !(toBookAccountsQuery.data ?? []).some(
        (row) => row.id === contraAccountId,
      ),
    staleTime: 60_000,
    retry: false,
  });

  const selectedContra =
    findAccount(contraQuery.data, contraAccountId) ??
    (pinnedContraQuery.data?.id === contraAccountId
      ? pinnedContraQuery.data
      : undefined);
  const needsClient =
    kind === 'income' &&
    (selectedContra?.accountCategory === AccountCategory.Sales ||
      (!selectedContra && isCorrecting && Boolean(customerId)));
  const needsInterestPayee =
    kind === 'expense' &&
    selectedContra?.accountCategory === AccountCategory.Interest;
  const needsDirector =
    ((kind === 'income' || kind === 'expense') &&
      selectedContra?.accountCategory === AccountCategory.DirectorAccount) ||
    (needsInterestPayee && interestPayee === 'director') ||
    (!selectedContra && isCorrecting && Boolean(directorId));
  const needsInvestor =
    ((kind === 'income' || kind === 'expense') &&
      selectedContra?.accountCategory === AccountCategory.InvestorAccount) ||
    (needsInterestPayee && interestPayee === 'investor') ||
    (!selectedContra && isCorrecting && Boolean(investorId));
  const needsLoanDetails =
    kind === 'income' &&
    selectedContra?.accountCategory === AccountCategory.Loan;
  const needsExpenseLoanNote =
    kind === 'expense' &&
    selectedContra?.accountCategory === AccountCategory.Loan;
  const needsExternalInterestNote =
    needsInterestPayee && interestPayee === 'external';
  const loanTypeChosen =
    needsLoanDetails &&
    (loanSecurity === 'secured' || loanSecurity === 'unsecured');
  const needsLoanInterestRate =
    loanTypeChosen && loanHasInterest === 'yes';
  const needsIncomeSource =
    kind === 'income' &&
    selectedContra?.accountCategory === AccountCategory.OtherIncome;
  /** Bank receipts/payments need cheque no. or transfer reference. */
  const needsPaymentInstrument = bookKind === 'bank';

  const customersQuery = useQuery({
    queryKey: ['project-finance', 'customers', open, needsClient],
    queryFn: async () => {
      const page = await fetchCustomers({ page: 1, limit: 100, status: 'active' });
      return page.items;
    },
    enabled: open && needsClient && hasPermission('customer.view'),
    staleTime: 30_000,
    retry: false,
  });

  const directorsQuery = useQuery({
    queryKey: ['project-finance', 'directors', open, needsDirector],
    queryFn: async () => {
      const page = await fetchDirectors({
        page: 1,
        limit: 100,
        status: DirectorStatus.Active,
      });
      return page.items;
    },
    enabled: open && needsDirector && hasPermission('director.view'),
    staleTime: 30_000,
    retry: false,
  });

  const investorsQuery = useQuery({
    queryKey: ['project-finance', 'investors', open, needsInvestor],
    queryFn: async () => {
      const page = await fetchInvestors({
        page: 1,
        limit: 100,
        status: InvestorStatus.Active,
      });
      return page.items;
    },
    enabled: open && needsInvestor && hasPermission('investor.view'),
    staleTime: 30_000,
    retry: false,
  });

  const bookOptions = useMemo(() => {
    const rows = [...(bookAccountsQuery.data ?? [])];
    if (
      pinnedBookQuery.data &&
      !rows.some((row) => row.id === pinnedBookQuery.data!.id)
    ) {
      rows.push(pinnedBookQuery.data);
    }
    const opts = rows
      .filter(
        (row) =>
          row.id === bookAccountId ||
          (row.allowManualPosting && !row.isControlAccount),
      )
      .map((row) => ({
        value: row.id,
        label: `${row.accountCode} — ${row.accountName}`,
      }));
    return withSelectOption(
      opts,
      bookAccountId,
      'Current bank/cash account',
    );
  }, [bookAccountsQuery.data, pinnedBookQuery.data, bookAccountId]);

  const contraOptions = useMemo(() => {
    const rows = [...(contraQuery.data ?? [])];
    if (
      pinnedContraQuery.data &&
      !rows.some((row) => row.id === pinnedContraQuery.data!.id)
    ) {
      rows.push(pinnedContraQuery.data);
    }
    const opts = rows.map((row) => ({
      value: row.id,
      label:
        kind === 'income'
          ? incomeAccountOptionLabel(row)
          : expenseAccountOptionLabel(row),
    }));
    const fallback =
      correctFrom?.row.accountCode && correctFrom.row.accountName
        ? `${correctFrom.row.accountCode} — ${correctFrom.row.accountName}`
        : 'Current account';
    return withSelectOption(opts, contraAccountId, fallback);
  }, [
    contraQuery.data,
    pinnedContraQuery.data,
    kind,
    contraAccountId,
    correctFrom?.row.accountCode,
    correctFrom?.row.accountName,
  ]);

  const costCentreOptions = useMemo(() => {
    const rows = applicableCostCentres(
      costCentresQuery.data?.items ?? [],
      projectId,
    );
    const opts = [
      { value: '', label: 'None (optional)' },
      ...rows.map((row) => ({
        value: row.id,
        label: `${row.code} — ${row.name}`,
      })),
    ];
    return withSelectOption(opts, costCentreId, 'Current cost centre');
  }, [costCentresQuery.data?.items, projectId, costCentreId]);

  const toBookOptions = useMemo(() => {
    const rows = [...(toBookAccountsQuery.data ?? [])];
    if (
      pinnedContraQuery.data &&
      !rows.some((row) => row.id === pinnedContraQuery.data!.id)
    ) {
      rows.push(pinnedContraQuery.data);
    }
    const opts = rows
      .filter(
        (row) =>
          row.id === contraAccountId ||
          (row.allowManualPosting && !row.isControlAccount),
      )
      .map((row) => ({
        value: row.id,
        label: `${row.accountCode} — ${row.accountName}`,
      }));
    return withSelectOption(opts, contraAccountId, 'Current destination account');
  }, [toBookAccountsQuery.data, pinnedContraQuery.data, contraAccountId]);

  const customerOptions = useMemo(
    () =>
      withSelectOption(
        (customersQuery.data ?? []).map((row) => ({
          value: row.id,
          label: `${row.customerCode} — ${row.fullName}`,
        })),
        customerId,
        'Current client',
      ),
    [customersQuery.data, customerId],
  );

  const directorOptions = useMemo(
    () =>
      withSelectOption(
        (directorsQuery.data ?? []).map((row) => ({
          value: row.id,
          label: `${row.directorCode} — ${row.fullName}`,
        })),
        directorId,
        correctFrom?.row.directorName?.trim() || 'Current director',
      ),
    [directorsQuery.data, directorId, correctFrom?.row.directorName],
  );

  const investorOptions = useMemo(
    () =>
      withSelectOption(
        (investorsQuery.data ?? []).map((row) => ({
          value: row.id,
          label: `${row.investorCode} — ${row.legalName}`,
        })),
        investorId,
        'Current investor',
      ),
    [investorsQuery.data, investorId],
  );

  useEffect(() => {
    if (!open) {
      reset(emptyFormDefaults(kind));
      return;
    }
    if (correctFrom?.journal && correctFrom.row) {
      reset(
        formValuesFromPrefill(
          prefillFromFinanceJournal(correctFrom.journal, correctFrom.row),
        ),
      );
      return;
    }
    reset(emptyFormDefaults(kind));
  }, [open, kind, correctFrom, reset]);

  useEffect(() => {
    if (!open || bookOptions.length === 0 || isCorrecting) return;
    const current = getValues('bookAccountId');
    if (current && bookOptions.some((opt) => opt.value === current)) {
      return;
    }
    if (bookKind === 'bank' && defaultBankLedgerQuery.data) {
      const preferred = defaultBankLedgerQuery.data;
      if (bookOptions.some((opt) => opt.value === preferred)) {
        setValue('bookAccountId', preferred);
        return;
      }
    }
    setValue('bookAccountId', bookOptions[0].value);
  }, [
    open,
    bookKind,
    bookOptions,
    defaultBankLedgerQuery.data,
    setValue,
    getValues,
    isCorrecting,
  ]);

  useEffect(() => {
    if (!open || isCorrecting || isTransfer || contraOptions.length === 0) {
      return;
    }
    const current = getValues('contraAccountId');
    // Only default when empty/invalid — never force back to External loan on change.
    if (!current || !contraOptions.some((opt) => opt.value === current)) {
      setValue('contraAccountId', contraOptions[0].value);
    }
  }, [open, contraOptions, setValue, getValues, isCorrecting, isTransfer]);

  useEffect(() => {
    if (!open || isCorrecting || !isTransfer || toBookOptions.length === 0) {
      return;
    }
    const current = getValues('contraAccountId');
    const fromId = getValues('bookAccountId');
    const preferred =
      toBookOptions.find((opt) => opt.value !== fromId) ?? toBookOptions[0];
    if (!current || !toBookOptions.some((opt) => opt.value === current)) {
      setValue('contraAccountId', preferred.value);
    }
  }, [
    open,
    toBookOptions,
    setValue,
    getValues,
    isCorrecting,
    isTransfer,
  ]);

  useEffect(() => {
    // Avoid wiping prefilled edit values while contra accounts are still loading.
    if (isCorrecting) return;
    if (!needsClient) setValue('customerId', '');
    if (!needsDirector) setValue('directorId', '');
    if (!needsInvestor) setValue('investorId', '');
    if (!needsInterestPayee) setValue('interestPayee', '');
    if (!needsLoanDetails) {
      setValue('loanSecurity', '');
      setValue('loanFrom', '');
      setValue('loanLenderName', '');
      setValue('loanHasInterest', '');
      setValue('loanInterestRate', undefined);
    }
    if (!loanTypeChosen) {
      setValue('loanFrom', '');
      setValue('loanLenderName', '');
      setValue('loanHasInterest', '');
      setValue('loanInterestRate', undefined);
    }
    if (!needsLoanInterestRate) {
      setValue('loanInterestRate', undefined);
    }
    if (!needsPaymentInstrument) {
      setValue('paymentMode', '');
      setValue('paymentReference', '');
    }
    if (!needsIncomeSource && !needsExternalInterestNote) {
      setValue('incomeSource', '');
    }
  }, [
    isCorrecting,
    needsClient,
    needsDirector,
    needsInvestor,
    needsInterestPayee,
    needsLoanDetails,
    loanTypeChosen,
    needsLoanInterestRate,
    needsPaymentInstrument,
    needsIncomeSource,
    needsExternalInterestNote,
    setValue,
  ]);

  useEffect(() => {
    if (!needsPaymentInstrument) return;
    if (
      paymentMode !== 'cheque' &&
      paymentMode !== 'account_transfer' &&
      paymentMode !== 'upi' &&
      paymentMode !== 'cash_withdrawal'
    ) {
      setValue('paymentReference', '');
    }
  }, [needsPaymentInstrument, paymentMode, setValue]);

  useEffect(() => {
    if (!open || !loanTypeChosen) return;
    if (loanSecurity === 'unsecured') {
      const current = getValues('loanFrom');
      if (!current) setValue('loanFrom', 'third_party');
    }
  }, [open, loanTypeChosen, loanSecurity, getValues, setValue]);

  useEffect(() => {
    if (!open || !needsDirector || directorOptions.length === 0) return;
    const current = getValues('directorId');
    if (!current || !directorOptions.some((opt) => opt.value === current)) {
      setValue('directorId', directorOptions[0].value);
    }
  }, [open, needsDirector, directorOptions, getValues, setValue]);

  useEffect(() => {
    if (!open || !needsInvestor || investorOptions.length === 0) return;
    const current = getValues('investorId');
    if (!current || !investorOptions.some((opt) => opt.value === current)) {
      setValue('investorId', investorOptions[0].value);
    }
  }, [open, needsInvestor, investorOptions, getValues, setValue]);

  const onSubmit = async (values: FormValues) => {
    if (!caps.canCreate) {
      notifyError(
        'You need journal.create to record project income, expense, or transfer.',
      );
      return;
    }

    if (isTransfer) {
      if (values.bookAccountId === values.contraAccountId) {
        notifyError('Choose different From and To accounts for a transfer.');
        return;
      }
      if (values.bookKind === 'bank') {
        if (!isBankPaymentMode(values.paymentMode)) {
          notifyError(
            'Choose cheque, account transfer, UPI, or cash withdrawal when transferring from bank.',
          );
          return;
        }
        if (
          values.paymentMode !== 'cash_withdrawal' &&
          !values.paymentReference?.trim()
        ) {
          notifyError(
            values.paymentMode === 'cheque'
              ? 'Enter the cheque number.'
              : values.paymentMode === 'upi'
                ? 'Enter the UPI transaction ID.'
                : 'Enter the transfer reference number.',
          );
          return;
        }
      }

      const narrationParts = [values.narration.trim()];
      if (values.bookKind === 'bank' && isBankPaymentMode(values.paymentMode)) {
        const paymentPart = paymentNarrationPart(
          values.paymentMode,
          values.paymentReference ?? '',
        );
        if (paymentPart) narrationParts.push(paymentPart);
      }

      const payload = buildProjectTransferJournal(
        {
          projectId,
          journalDate: values.journalDate,
          amount: values.amount,
          narration: narrationParts.join(' · '),
          fromAccountId: values.bookAccountId,
          toAccountId: values.contraAccountId,
        },
        { post: caps.canPost },
      );

      try {
        if (isCorrecting && correctFrom?.journal) {
          if (!caps.canReverse) {
            notifyError(
              'You need journal.reverse to edit a posted transfer.',
            );
            return;
          }
          if (correctFrom.journal.reversalOf || correctFrom.journal.reversedBy) {
            notifyError('This voucher cannot be edited.');
            return;
          }
          const journal = await amend.mutateAsync({
            id: correctFrom.journal.id,
            input: {
              journalDate: payload.journalDate,
              narration: payload.narration,
              projectId: payload.projectId,
              lines: payload.lines,
            },
          });
          void qc.invalidateQueries({ queryKey: cashBankBookQueryKeys.all });
          success(`Transfer ${journal.journalNumber} updated`);
          onClose();
          return;
        }

        let journal = await create.mutateAsync(payload);
        if (!caps.canPost) {
          journal = await submit.mutateAsync(journal.id);
        }
        void qc.invalidateQueries({ queryKey: cashBankBookQueryKeys.all });
        success(
          `Transfer ${journal.journalNumber} recorded for this project${
            caps.canPost ? '' : ' (submitted for posting)'
          }`,
        );
        onClose();
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
      return;
    }

    const contra = findAccount(contraQuery.data, values.contraAccountId);
    if (kind === 'income' && contra?.accountCategory === AccountCategory.Sales) {
      if (!values.customerId?.trim()) {
        notifyError('Select the client this sale income is from.');
        return;
      }
      if (!hasPermission('customer.view')) {
        notifyError('You need customer.view to pick a client for sale income.');
        return;
      }
    }
    if (
      kind === 'expense' &&
      contra?.accountCategory === AccountCategory.Interest
    ) {
      if (
        values.interestPayee !== 'director' &&
        values.interestPayee !== 'investor' &&
        values.interestPayee !== 'external'
      ) {
        notifyError(
          'Choose whether interest is paid to a director, investor, or external lender.',
        );
        return;
      }
      if (
        values.interestPayee === 'external' &&
        !values.incomeSource?.trim()
      ) {
        notifyError('Enter who the interest was paid to (lender name).');
        return;
      }
    }
    if (
      ((kind === 'income' || kind === 'expense') &&
        contra?.accountCategory === AccountCategory.DirectorAccount) ||
      (kind === 'expense' &&
        contra?.accountCategory === AccountCategory.Interest &&
        values.interestPayee === 'director')
    ) {
      if (!values.directorId?.trim()) {
        notifyError(
          kind === 'expense'
            ? contra?.accountCategory === AccountCategory.Interest
              ? 'Select which director received this interest.'
              : 'Select which director this loan repayment is to.'
            : 'Select which director this loan is from.',
        );
        return;
      }
      if (!hasPermission('director.view')) {
        notifyError(
          'You need director.view to pick the director for this loan.',
        );
        return;
      }
    }
    if (
      ((kind === 'income' || kind === 'expense') &&
        contra?.accountCategory === AccountCategory.InvestorAccount) ||
      (kind === 'expense' &&
        contra?.accountCategory === AccountCategory.Interest &&
        values.interestPayee === 'investor')
    ) {
      if (!values.investorId?.trim()) {
        notifyError(
          kind === 'expense'
            ? contra?.accountCategory === AccountCategory.Interest
              ? 'Select which investor received this interest.'
              : 'Select which investor this repayment is to.'
            : 'Select which investor this funding is from.',
        );
        return;
      }
      if (!hasPermission('investor.view')) {
        notifyError(
          'You need investor.view to pick the investor for this funding.',
        );
        return;
      }
    }
    if (kind === 'income' && contra?.accountCategory === AccountCategory.Loan) {
      if (values.loanSecurity !== 'secured' && values.loanSecurity !== 'unsecured') {
        notifyError('Choose whether this loan is secured or unsecured.');
        return;
      }
      if (values.loanFrom !== 'bank' && values.loanFrom !== 'third_party') {
        notifyError('Choose whether the loan is from a bank or a 3rd party.');
        return;
      }
      if (values.loanHasInterest !== 'yes' && values.loanHasInterest !== 'no') {
        notifyError('Say whether this loan is with interest or without interest.');
        return;
      }
      if (values.loanHasInterest === 'yes') {
        if (
          values.loanInterestRate == null ||
          Number.isNaN(Number(values.loanInterestRate))
        ) {
          notifyError('Enter the interest rate (% p.a.).');
          return;
        }
      }
    }
    if (
      kind === 'income' &&
      contra?.accountCategory === AccountCategory.OtherIncome
    ) {
      if (!values.incomeSource?.trim()) {
        notifyError('Mention where this other income came from.');
        return;
      }
    }
    if (values.bookKind === 'bank') {
      if (!isBankPaymentMode(values.paymentMode)) {
        notifyError(
          'Choose cheque, account transfer, UPI, or cash withdrawal for bank entries.',
        );
        return;
      }
      if (
        values.paymentMode !== 'cash_withdrawal' &&
        !values.paymentReference?.trim()
      ) {
        notifyError(
          values.paymentMode === 'cheque'
            ? 'Enter the cheque number.'
            : values.paymentMode === 'upi'
              ? 'Enter the UPI transaction ID.'
              : 'Enter the transfer reference number.',
        );
        return;
      }
    }

    try {
      const isInterestExpense =
        kind === 'expense' &&
        contra?.accountCategory === AccountCategory.Interest;

      const fundingSource = kind === 'income'
        ? resolveIncomeFundingSource(contra?.accountCategory)
        : isInterestExpense
          ? values.interestPayee === 'director'
            ? JournalFundingSource.Director
            : values.interestPayee === 'investor'
              ? JournalFundingSource.Investor
              : JournalFundingSource.Loan
          : resolveExpenseFundingSource(contra?.accountCategory);

      const partyType = isInterestExpense
        ? values.interestPayee === 'director'
          ? JournalPartyType.Director
          : values.interestPayee === 'investor'
            ? JournalPartyType.Investor
            : null
        : kind === 'income' || kind === 'expense'
          ? resolveIncomePartyType(contra?.accountCategory)
          : null;
      const partyId =
        partyType === JournalPartyType.Customer
          ? values.customerId?.trim() || null
          : partyType === JournalPartyType.Director
            ? values.directorId?.trim() || null
            : partyType === JournalPartyType.Investor
              ? values.investorId?.trim() || null
              : null;

      const customerLabel = customerOptions.find(
        (opt) => opt.value === values.customerId,
      )?.label;
      const directorLabel = directorOptions.find(
        (opt) => opt.value === values.directorId,
      )?.label;
      const investorLabel = investorOptions.find(
        (opt) => opt.value === values.investorId,
      )?.label;
      const narrationParts = [values.narration.trim()];
      if (needsDirector && directorLabel) {
        narrationParts.push(
          isInterestExpense
            ? `Interest paid to director: ${directorLabel}`
            : kind === 'expense'
              ? `Director loan repayment: ${directorLabel}`
              : `Director loan: ${directorLabel}`,
        );
      }
      if (needsInvestor && investorLabel) {
        narrationParts.push(
          isInterestExpense
            ? `Interest paid to investor: ${investorLabel}`
            : kind === 'expense'
              ? `Investor loan repayment: ${investorLabel}`
              : `Investor loan: ${investorLabel}`,
        );
      }
      if (needsExpenseLoanNote) {
        narrationParts.push('External loan repayment');
      }
      if (needsExternalInterestNote && values.incomeSource?.trim()) {
        narrationParts.push(
          `Interest paid to lender: ${values.incomeSource.trim()}`,
        );
      }
      if (
        needsLoanDetails &&
        (values.loanSecurity === 'secured' ||
          values.loanSecurity === 'unsecured')
      ) {
        narrationParts.push(
          formatExternalLoanNarration({
            security: values.loanSecurity,
            hasInterest: values.loanHasInterest === 'yes',
            interestRate:
              values.loanHasInterest === 'yes'
                ? values.loanInterestRate
                : null,
            lenderKind:
              values.loanFrom === 'bank' || values.loanFrom === 'third_party'
                ? values.loanFrom
                : null,
            lenderName: values.loanLenderName,
          }),
        );
      }
      if (needsClient && customerLabel) {
        narrationParts.push(`Client: ${customerLabel}`);
      }
      if (needsIncomeSource && values.incomeSource?.trim()) {
        narrationParts.push(`From: ${values.incomeSource.trim()}`);
      }
      if (values.bookKind === 'bank' && isBankPaymentMode(values.paymentMode)) {
        const paymentPart = paymentNarrationPart(
          values.paymentMode,
          values.paymentReference ?? '',
        );
        if (paymentPart) narrationParts.push(paymentPart);
      }

      const payload = buildProjectFinanceJournal(
        {
          projectId,
          journalDate: values.journalDate,
          amount: values.amount,
          narration: narrationParts.join(' · '),
          bookAccountId: values.bookAccountId,
          contraAccountId: values.contraAccountId,
          kind,
          fundingSource,
          partyType,
          partyId,
          costCentreId:
            kind === 'expense' && values.costCentreId
              ? values.costCentreId
              : null,
        },
        { post: caps.canPost },
      );

      if (isCorrecting && correctFrom?.journal) {
        if (!caps.canReverse) {
          notifyError(
            'You need journal.reverse to edit a posted income/expense.',
          );
          return;
        }
        if (correctFrom.journal.reversalOf) {
          notifyError(
            'This row is a reversal voucher. Edit the original income/expense instead.',
          );
          return;
        }
        if (correctFrom.journal.reversedBy) {
          notifyError(
            'This voucher was already reversed. It can no longer be edited.',
          );
          return;
        }
        const journal = await amend.mutateAsync({
          id: correctFrom.journal.id,
          input: {
            journalDate: payload.journalDate,
            narration: payload.narration,
            projectId: payload.projectId,
            lines: payload.lines,
          },
        });
        void qc.invalidateQueries({ queryKey: cashBankBookQueryKeys.all });
        success(
          `${kind === 'income' ? 'Income' : 'Expense'} ${journal.journalNumber} updated`,
        );
        onClose();
        return;
      }

      let journal = await create.mutateAsync(payload);
      if (!caps.canPost) {
        journal = await submit.mutateAsync(journal.id);
      }

      void qc.invalidateQueries({ queryKey: cashBankBookQueryKeys.all });
      success(
        `${kind === 'income' ? 'Income' : 'Expense'} ${journal.journalNumber} recorded for this project${
          caps.canPost ? '' : ' (submitted for posting)'
        }`,
      );
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const saving =
    create.isPending || submit.isPending || amend.isPending;
  const title = isCorrecting
    ? kind === 'income'
      ? 'Edit project income'
      : kind === 'transfer'
        ? 'Edit project transfer'
        : 'Edit project expense'
    : kind === 'income'
      ? 'Add project income'
      : kind === 'transfer'
        ? 'Transfer between books'
        : 'Add project expense';

  const destinationOptions = isTransfer ? toBookOptions : contraOptions;
  const destinationLoading = isTransfer
    ? toBookAccountsQuery.isLoading
    : contraQuery.isLoading;

  return (
    <>
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}
    >
      <Box sx={{ p: 2.5 }} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {projectName ? (
              <>
                For <strong>{projectName}</strong>.{' '}
              </>
            ) : null}
            {isCorrecting && correctFrom?.journal ? (
              <>
                Editing voucher <strong>{correctFrom.journal.journalNumber}</strong>.
                Changes are saved on this same voucher (no new JV number).
              </>
            ) : kind === 'income' ? (
              <>
                Money received into the company <strong>bank</strong> or{' '}
                <strong>cash</strong> book for this project. Bank entries need
                cheque number, transfer reference, or UPI transaction ID. Pick
                director / investor / loan details as applicable; sale income
                needs a client.
              </>
            ) : kind === 'transfer' ? (
              <>
                Move money between company <strong>bank</strong> and{' '}
                <strong>cash</strong> accounts in one voucher (not as separate
                expense + income).
              </>
            ) : (
              <>
                Paid from company <strong>bank book</strong> or{' '}
                <strong>cash book</strong> (not site petty cash). For rent,
                approvals, land registration, or government fees: pick an
                existing cost account, or press <strong>+</strong> to create
                one (e.g. Land cost / Direct / Indirect expense).
              </>
            )}
          </Typography>

          {isCorrecting ? (
            <Alert severity="info" variant="outlined">
              Existing values are loaded. Update only what is wrong, then save.
            </Alert>
          ) : null}

          {!caps.canCreate ? (
            <Alert severity="warning">Requires journal.create.</Alert>
          ) : null}
          {!hasPermission('account.view') ? (
            <Alert severity="warning">
              Requires account.view to load bank/cash and ledger accounts.
            </Alert>
          ) : null}

          <FormTextField
            name="journalDate"
            control={control}
            label="Date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormSelect
            name="bookKind"
            control={control}
            label={
              isTransfer
                ? 'From book'
                : 'Received into / paid from'
            }
            options={[
              { value: 'bank', label: 'Bank book' },
              { value: 'cash', label: 'Cash book (company cash)' },
            ]}
          />
          <FormSelect
            name="bookAccountId"
            control={control}
            label={
              isTransfer
                ? bookKind === 'bank'
                  ? 'From bank account'
                  : 'From cash account'
                : bookKind === 'bank'
                  ? 'Bank account'
                  : 'Cash account'
            }
            options={bookOptions}
            disabled={bookAccountsQuery.isLoading || bookOptions.length === 0}
          />
          {isTransfer ? (
            <>
              <FormSelect
                name="toBookKind"
                control={control}
                label="To book"
                options={[
                  { value: 'bank', label: 'Bank book' },
                  { value: 'cash', label: 'Cash book (company cash)' },
                ]}
              />
              <FormSelect
                name="contraAccountId"
                control={control}
                label={
                  toBookKind === 'bank'
                    ? 'To bank account'
                    : 'To cash account'
                }
                options={destinationOptions}
                disabled={
                  destinationLoading || destinationOptions.length === 0
                }
              />
            </>
          ) : (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormSelect
                  name="contraAccountId"
                  control={control}
                  label={
                    kind === 'income'
                      ? 'Money from (source type)'
                      : 'Paid to / expense account'
                  }
                  options={destinationOptions}
                  disabled={
                    destinationLoading || destinationOptions.length === 0
                  }
                />
              </Box>
              {kind === 'expense' ? (
                <Tooltip
                  title={
                    canManageAccounts
                      ? 'Add expense / cost account'
                      : 'Needs account.manage to add accounts'
                  }
                >
                  <span>
                    <IconButton
                      color="primary"
                      aria-label="Add expense account"
                      disabled={!canManageAccounts}
                      onClick={() => setCreateExpenseAccountOpen(true)}
                      sx={{ mt: 0.5 }}
                      data-testid="add-expense-account"
                    >
                      <AddIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Stack>
          )}

          {kind === 'expense' ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <FormSelect
                  name="costCentreId"
                  control={control}
                  label="Cost centre (optional)"
                  options={costCentreOptions}
                  disabled={
                    !canViewCostCentres || costCentresQuery.isLoading
                  }
                />
              </Box>
              <Tooltip
                title={
                  canManageCostCentres
                    ? 'Add cost centre (e.g. Footing)'
                    : 'Needs cost_centre.manage'
                }
              >
                <span>
                  <IconButton
                    color="primary"
                    aria-label="Add cost centre"
                    disabled={!canManageCostCentres}
                    onClick={() => setCreateCostCentreOpen(true)}
                    sx={{ mt: 0.5 }}
                    data-testid="add-cost-centre"
                  >
                    <AddIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ) : null}

          {kind === 'income' &&
          selectedContra &&
          (selectedContra.accountCategory === AccountCategory.DirectorAccount ||
            selectedContra.accountCategory === AccountCategory.Loan ||
            selectedContra.accountCategory === AccountCategory.InvestorAccount ||
            selectedContra.accountCategory === AccountCategory.Sales ||
            selectedContra.accountCategory ===
              AccountCategory.OtherIncome) ? (
            <Alert severity="info" variant="outlined">
              {selectedContra.accountCategory ===
              AccountCategory.DirectorAccount
                ? 'Director money is recorded as a loan to this project. Pick the director so liability is tracked against them.'
                : null}
              {selectedContra.accountCategory === AccountCategory.InvestorAccount
                ? 'Investor money is recorded as a loan / funding to this project. Pick the investor.'
                : null}
              {selectedContra.accountCategory === AccountCategory.Loan
                ? 'External loan — secured or unsecured, from bank or 3rd party, and whether it carries interest (some unsecured loans are interest-free).'
                : null}
              {selectedContra.accountCategory === AccountCategory.Sales
                ? 'Sale income — choose which client paid.'
                : null}
              {selectedContra.accountCategory === AccountCategory.OtherIncome
                ? 'Other income — type where this money came from.'
                : null}
            </Alert>
          ) : null}

          {kind === 'expense' &&
          selectedContra &&
          (selectedContra.accountCategory === AccountCategory.DirectorAccount ||
            selectedContra.accountCategory === AccountCategory.InvestorAccount ||
            selectedContra.accountCategory === AccountCategory.Loan ||
            selectedContra.accountCategory === AccountCategory.Interest) ? (
            <Alert severity="info" variant="outlined">
              {selectedContra.accountCategory ===
              AccountCategory.DirectorAccount
                ? 'This pays principal back to a director against their project loan. For interest only, choose Interest paid instead.'
                : null}
              {selectedContra.accountCategory === AccountCategory.InvestorAccount
                ? 'This pays principal back to an investor. For interest only, choose Interest paid instead.'
                : null}
              {selectedContra.accountCategory === AccountCategory.Loan
                ? 'This pays down external loan principal. For interest only, choose Interest paid instead.'
                : null}
              {selectedContra.accountCategory === AccountCategory.Interest
                ? 'Interest only — does not reduce the loan principal. Choose who received the interest (director, investor, or external lender).'
                : null}
            </Alert>
          ) : null}

          {needsInterestPayee ? (
            <FormSelect
              name="interestPayee"
              control={control}
              label="Interest paid to"
              options={[
                { value: 'director', label: 'Director' },
                { value: 'investor', label: 'Investor' },
                { value: 'external', label: 'External lender (bank / 3rd party)' },
              ]}
            />
          ) : null}

          {needsExternalInterestNote ? (
            <FormTextField
              name="incomeSource"
              control={control}
              label="Lender name"
              placeholder="e.g. ICICI Bank, ABC Finance"
            />
          ) : null}

          {needsDirector ? (
            <FormSelect
              name="directorId"
              control={control}
              label={
                needsInterestPayee
                  ? 'Director (interest to)'
                  : kind === 'expense'
                    ? 'Director (repay principal to)'
                    : 'Director (loan from)'
              }
              options={directorOptions}
              disabled={
                directorsQuery.isLoading ||
                directorOptions.length === 0 ||
                !hasPermission('director.view')
              }
            />
          ) : null}
          {needsDirector && !hasPermission('director.view') ? (
            <Alert severity="warning">
              You need director.view to pick which director this loan is from.
            </Alert>
          ) : null}
          {needsDirector &&
          hasPermission('director.view') &&
          !directorsQuery.isLoading &&
          directorOptions.length === 0 ? (
            <Alert severity="warning">
              No active directors found. Add directors under Capital →
              Directors first.
            </Alert>
          ) : null}

          {needsInvestor ? (
            <FormSelect
              name="investorId"
              control={control}
              label={
                needsInterestPayee
                  ? 'Investor (interest to)'
                  : kind === 'expense'
                    ? 'Investor (repay principal to)'
                    : 'Investor (loan from)'
              }
              options={investorOptions}
              disabled={
                investorsQuery.isLoading ||
                investorOptions.length === 0 ||
                !hasPermission('investor.view')
              }
            />
          ) : null}
          {needsInvestor && !hasPermission('investor.view') ? (
            <Alert severity="warning">
              You need investor.view to pick which investor this funding is from.
            </Alert>
          ) : null}
          {needsInvestor &&
          hasPermission('investor.view') &&
          !investorsQuery.isLoading &&
          investorOptions.length === 0 ? (
            <Alert severity="warning">
              No active investors found. Add investors under Capital → Investors
              first.
            </Alert>
          ) : null}

          {needsLoanDetails ? (
            <>
              <FormSelect
                name="loanSecurity"
                control={control}
                label="Loan type"
                options={[
                  { value: 'secured', label: 'Secured' },
                  { value: 'unsecured', label: 'Unsecured' },
                ]}
              />
              {loanTypeChosen ? (
                <>
                  <FormSelect
                    name="loanFrom"
                    control={control}
                    label="Loan from"
                    options={[
                      { value: 'bank', label: 'Bank' },
                      { value: 'third_party', label: '3rd party' },
                    ]}
                  />
                  <FormTextField
                    name="loanLenderName"
                    control={control}
                    label={
                      loanFrom === 'third_party'
                        ? '3rd party name'
                        : 'Bank / lender name'
                    }
                    placeholder={
                      loanFrom === 'third_party'
                        ? 'e.g. ABC Finance, private lender…'
                        : 'e.g. ICICI Bank…'
                    }
                  />
                  <FormSelect
                    name="loanHasInterest"
                    control={control}
                    label="Interest"
                    options={[
                      { value: 'yes', label: 'With interest' },
                      { value: 'no', label: 'Without interest' },
                    ]}
                  />
                  {needsLoanInterestRate ? (
                    <FormTextField
                      name="loanInterestRate"
                      control={control}
                      label="Interest rate (% p.a.)"
                      type="number"
                      slotProps={{
                        htmlInput: { min: 0, max: 100, step: 0.01 },
                      }}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {needsClient ? (
            <FormSelect
              name="customerId"
              control={control}
              label="Client (sale from)"
              options={customerOptions}
              disabled={
                customersQuery.isLoading ||
                customerOptions.length === 0 ||
                !hasPermission('customer.view')
              }
            />
          ) : null}
          {needsClient && !hasPermission('customer.view') ? (
            <Alert severity="warning">
              You need customer.view to pick the client for sale income.
            </Alert>
          ) : null}
          {needsClient &&
          hasPermission('customer.view') &&
          !customersQuery.isLoading &&
          customerOptions.length === 0 ? (
            <Alert severity="warning">
              No active clients found. Create a customer first under Sales →
              Customers.
            </Alert>
          ) : null}

          {needsIncomeSource ? (
            <FormTextField
              name="incomeSource"
              control={control}
              label="From where (source)"
              placeholder="e.g. Scrap sale, insurance claim, refund…"
            />
          ) : null}

          {needsPaymentInstrument ? (
            <>
              <FormSelect
                name="paymentMode"
                control={control}
                label="Paid by"
                options={[
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'account_transfer', label: 'Account transfer' },
                  { value: 'upi', label: 'UPI' },
                  { value: 'cash_withdrawal', label: 'Cash withdrawal' },
                ]}
              />
              {paymentMode === 'cheque' ? (
                <FormTextField
                  name="paymentReference"
                  control={control}
                  label="Cheque number"
                  placeholder="e.g. 123456"
                />
              ) : null}
              {paymentMode === 'account_transfer' ? (
                <FormTextField
                  name="paymentReference"
                  control={control}
                  label="Transfer reference number"
                  placeholder="e.g. UTR / NEFT / IMPS reference"
                />
              ) : null}
              {paymentMode === 'upi' ? (
                <FormTextField
                  name="paymentReference"
                  control={control}
                  label="Transaction ID"
                  placeholder="e.g. UPI transaction ID"
                />
              ) : null}
              {paymentMode === 'cash_withdrawal' ? (
                <FormTextField
                  name="paymentReference"
                  control={control}
                  label="Slip / ATM reference (optional)"
                  placeholder="e.g. ATM slip or withdrawal slip no."
                />
              ) : null}
            </>
          ) : null}

          <Stack spacing={0.5}>
            <FormTextField
              name="amount"
              control={control}
              label="Amount (INR)"
              type="number"
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
            />
            {amountInWords ? (
              <Typography
                variant="caption"
                color="text.secondary"
                data-testid="finance-amount-in-words"
              >
                {amountInWords}
              </Typography>
            ) : null}
          </Stack>
          <FormTextField
            name="narration"
            control={control}
            label="Narration / purpose"
            multiline
            minRows={2}
          />

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                !caps.canCreate ||
                bookOptions.length === 0 ||
                destinationOptions.length === 0 ||
                (isTransfer &&
                  bookAccountId &&
                  contraAccountId &&
                  bookAccountId === contraAccountId) ||
                (needsInterestPayee &&
                  interestPayee !== 'director' &&
                  interestPayee !== 'investor' &&
                  interestPayee !== 'external') ||
                (needsExternalInterestNote && !incomeSource?.trim()) ||
                (needsDirector &&
                  (!hasPermission('director.view') ||
                    directorOptions.length === 0)) ||
                (needsInvestor &&
                  (!hasPermission('investor.view') ||
                    investorOptions.length === 0)) ||
                (needsLoanDetails &&
                  (loanSecurity !== 'secured' &&
                    loanSecurity !== 'unsecured' ||
                    (loanFrom !== 'bank' && loanFrom !== 'third_party') ||
                    (loanHasInterest !== 'yes' && loanHasInterest !== 'no') ||
                    (loanHasInterest === 'yes' &&
                      (loanInterestRate == null ||
                        Number.isNaN(Number(loanInterestRate)))))) ||
                (needsClient &&
                  (!hasPermission('customer.view') ||
                    customerOptions.length === 0)) ||
                (needsPaymentInstrument &&
                  (!isBankPaymentMode(paymentMode) ||
                    (paymentMode !== 'cash_withdrawal' &&
                      !paymentReference?.trim())))
              }
            >
              {saving
                ? 'Saving…'
                : isCorrecting
                  ? 'Save changes'
                  : kind === 'income'
                    ? 'Save income'
                    : kind === 'transfer'
                      ? 'Save transfer'
                      : 'Save expense'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>

    {kind === 'expense' ? (
      <QuickCreateExpenseAccountDialog
        open={createExpenseAccountOpen}
        onClose={() => setCreateExpenseAccountOpen(false)}
        onCreated={async (account) => {
          await contraQuery.refetch();
          setValue('contraAccountId', account.id, {
            shouldValidate: true,
            shouldDirty: true,
          });
          success(
            `Account ${account.accountCode} — ${account.accountName} added`,
          );
        }}
      />
    ) : null}

    {kind === 'expense' ? (
      <QuickCreateCostCentreDialog
        open={createCostCentreOpen}
        kind={CostCentreKind.CostCentre}
        projectId={projectId}
        projectCode={projectCode}
        projectName={projectName}
        onClose={() => setCreateCostCentreOpen(false)}
        onCreated={async (row) => {
          await qc.invalidateQueries({ queryKey: costCentresKeys.all });
          await costCentresQuery.refetch();
          setValue('costCentreId', row.id, {
            shouldValidate: true,
            shouldDirty: true,
          });
          success(`Cost centre ${row.code} — ${row.name} added`);
        }}
      />
    ) : null}
    </>
  );
}
