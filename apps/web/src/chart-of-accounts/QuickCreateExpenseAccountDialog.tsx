import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage, isConflictError } from '@/api/errors';
import { createAccount } from './api';
import {
  AccountCategory,
  AccountType,
  type PublicAccount,
} from './types';

const EXPENSE_CATEGORY_OPTIONS = [
  {
    value: AccountCategory.DirectExpense,
    label: 'Direct expense',
    hint: 'Site / project costs (approvals, fees tied to construction)',
  },
  {
    value: AccountCategory.IndirectExpense,
    label: 'Indirect expense',
    hint: 'Office / admin (rent, utilities, general overhead)',
  },
  {
    value: AccountCategory.LandCost,
    label: 'Land cost',
    hint: 'Land registration, stamp duty, government land fees',
  },
  {
    value: AccountCategory.MaterialPurchase,
    label: 'Material purchase',
    hint: 'Cement, steel, and other materials',
  },
  {
    value: AccountCategory.WorkInProgress,
    label: 'Work in progress',
    hint: 'Capitalised project WIP (if you track that way)',
  },
] as const;

type ExpenseCategory = (typeof EXPENSE_CATEGORY_OPTIONS)[number]['value'];

/** One-tap examples for common Madambakkam-style project costs. */
const COST_PRESETS: {
  name: string;
  category: ExpenseCategory;
}[] = [
  { name: 'Site / office rent', category: AccountCategory.IndirectExpense },
  {
    name: 'Project approval / planning fee',
    category: AccountCategory.DirectExpense,
  },
  {
    name: 'Land registration & stamp duty',
    category: AccountCategory.LandCost,
  },
  {
    name: 'Government / statutory fee',
    category: AccountCategory.DirectExpense,
  },
  { name: 'Auditor fee', category: AccountCategory.IndirectExpense },
  {
    name: 'Company secretary fee',
    category: AccountCategory.IndirectExpense,
  },
  { name: 'Advocate / legal fee', category: AccountCategory.IndirectExpense },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (account: PublicAccount) => void | Promise<void>;
};

function accountTypeForCategory(category: ExpenseCategory) {
  if (
    category === AccountCategory.LandCost ||
    category === AccountCategory.WorkInProgress
  ) {
    return AccountType.Asset;
  }
  return AccountType.Expense;
}

function suggestCode(name: string, category: ExpenseCategory): string {
  const prefix =
    category === AccountCategory.LandCost
      ? 'LAND'
      : category === AccountCategory.MaterialPurchase
        ? 'MAT'
        : category === AccountCategory.WorkInProgress
          ? 'WIP'
          : category === AccountCategory.IndirectExpense
            ? 'IEXP'
            : 'DEXP';
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);
  if (slug) return `${prefix}-${slug}`;
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${stamp}`;
}

/**
 * Quick-create a postable expense/cost account from project expense entry.
 * Requires `account.manage`.
 */
export function QuickCreateExpenseAccountDialog({
  open,
  onClose,
  onCreated,
}: Props) {
  const [accountName, setAccountName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [accountCategory, setAccountCategory] = useState<ExpenseCategory>(
    AccountCategory.DirectExpense,
  );
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAccountName('');
    setAccountCategory(AccountCategory.DirectExpense);
    setAccountCode(suggestCode('', AccountCategory.DirectExpense));
    setCodeTouched(false);
    setError(null);
    setSaving(false);
  }, [open]);

  const categoryMeta =
    EXPENSE_CATEGORY_OPTIONS.find((opt) => opt.value === accountCategory) ??
    EXPENSE_CATEGORY_OPTIONS[0];

  const applyPreset = (preset: (typeof COST_PRESETS)[number]) => {
    setAccountName(preset.name);
    setAccountCategory(preset.category);
    setCodeTouched(false);
    setAccountCode(suggestCode(preset.name, preset.category));
    setError(null);
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  const submit = async () => {
    const trimmedCode = accountCode.trim().toUpperCase();
    const trimmedName = accountName.trim();
    if (!trimmedName) {
      setError('Account name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Account code is required');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedCode)) {
      setError('Code must be alphanumeric (underscore/hyphen allowed)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createAccount({
        accountCode: trimmedCode,
        accountName: trimmedName,
        accountType: accountTypeForCategory(accountCategory),
        accountCategory,
        parentAccountId: null,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: true,
        requiresParty: false,
      });
      await onCreated(created);
      onClose();
    } catch (err) {
      if (isConflictError(err)) {
        const next = suggestCode(trimmedName, accountCategory);
        setAccountCode(next === trimmedCode ? `${trimmedCode}-2` : next);
        setError(
          `${getErrorMessage(err)}. Suggested a new code — review and Create again.`,
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      data-testid="quick-create-expense-account-dialog"
    >
      <DialogTitle>Add expense / cost account</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Use this for rent, approvals, land registration, government fees,
            and other project costs. After create, the new account is selected
            on the expense form — then enter amount and save.
          </Typography>

          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              Common costs (tap to fill)
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              {COST_PRESETS.map((preset) => (
                <Chip
                  key={preset.name}
                  label={preset.name}
                  size="small"
                  variant="outlined"
                  onClick={() => applyPreset(preset)}
                  disabled={saving}
                />
              ))}
            </Stack>
          </Stack>

          <TextField
            label="Account name"
            value={accountName}
            onChange={(event) => {
              const nextName = event.target.value;
              setAccountName(nextName);
              if (!codeTouched) {
                setAccountCode(suggestCode(nextName, accountCategory));
              }
            }}
            required
            autoFocus
            helperText="Example: Land registration — government fee · Madambakkam"
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="quick-expense-category-label">Category</InputLabel>
            <Select
              labelId="quick-expense-category-label"
              label="Category"
              value={accountCategory}
              onChange={(event) => {
                const next = event.target.value as ExpenseCategory;
                setAccountCategory(next);
                if (!codeTouched) {
                  setAccountCode(suggestCode(accountName, next));
                }
              }}
            >
              {EXPENSE_CATEGORY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75 }}>
              {categoryMeta.hint}
            </Typography>
          </FormControl>
          <TextField
            label="Account code"
            value={accountCode}
            onChange={(event) => {
              setCodeTouched(true);
              setAccountCode(event.target.value.toUpperCase());
            }}
            required
            helperText="Must be unique. Auto-fills from name; edit if needed."
            fullWidth
          />
          {error ? <Alert severity="warning">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={saving}
        >
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
