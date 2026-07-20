import type { PublicAccount } from '@/chart-of-accounts/types';
import {
  isJournalBalanced,
  moneyEquals,
  roundMoney,
} from './balance';

export type JournalLineDraft = {
  accountId: string;
  debit: number;
  credit: number;
  projectId?: string | null;
  partyType?: string | null;
  partyId?: string | null;
  description?: string | null;
};

export type JournalLineIssue = {
  lineIndex: number;
  field?: 'accountId' | 'debit' | 'credit' | 'projectId' | 'partyId' | 'partyType';
  message: string;
};

export type JournalEntryValidation = {
  ok: boolean;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  issues: JournalLineIssue[];
};

/**
 * Client preview of Nest `validateAndNormalizeLines` + dimension rules.
 * Server remains authoritative.
 */
export function validateJournalEntryDraft(args: {
  lines: readonly JournalLineDraft[];
  headerProjectId?: string | null;
  accountById: ReadonlyMap<string, PublicAccount>;
}): JournalEntryValidation {
  const issues: JournalLineIssue[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  if (args.lines.length < 2) {
    issues.push({
      lineIndex: -1,
      message: 'A journal entry requires at least two lines',
    });
  }

  args.lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    if (!line.accountId?.trim()) {
      issues.push({
        lineIndex: index,
        field: 'accountId',
        message: `${label}: account is required`,
      });
    }

    const debit = roundMoney(Number(line.debit ?? 0));
    const credit = roundMoney(Number(line.credit ?? 0));

    if (Number.isNaN(debit) || Number.isNaN(credit) || debit < 0 || credit < 0) {
      issues.push({
        lineIndex: index,
        field: 'debit',
        message: `${label}: debit and credit must be non-negative numbers`,
      });
    }
    if (debit > 0 && credit > 0) {
      issues.push({
        lineIndex: index,
        field: 'debit',
        message: `${label}: a line cannot contain both debit and credit`,
      });
    }
    if (moneyEquals(debit, 0) && moneyEquals(credit, 0)) {
      issues.push({
        lineIndex: index,
        field: 'debit',
        message: `${label}: either debit or credit must be greater than zero`,
      });
    }

    totalDebit = roundMoney(totalDebit + (Number.isNaN(debit) ? 0 : debit));
    totalCredit = roundMoney(totalCredit + (Number.isNaN(credit) ? 0 : credit));

    const account = line.accountId
      ? args.accountById.get(line.accountId)
      : undefined;
    if (account) {
      if (account.status !== 'active') {
        issues.push({
          lineIndex: index,
          field: 'accountId',
          message: `${label}: account must be active`,
        });
      }
      if (!account.allowManualPosting) {
        issues.push({
          lineIndex: index,
          field: 'accountId',
          message: `${label}: account does not allow manual posting`,
        });
      }
      const projectId = line.projectId?.trim() || args.headerProjectId?.trim();
      if (account.requiresProject && !projectId) {
        issues.push({
          lineIndex: index,
          field: 'projectId',
          message: `${label}: account ${account.accountCode} requires a project`,
        });
      }
      if (account.requiresParty && !line.partyId?.trim()) {
        issues.push({
          lineIndex: index,
          field: 'partyId',
          message: `${label}: account ${account.accountCode} requires a party`,
        });
      }
    }

    if (line.partyId?.trim() && !line.partyType?.trim()) {
      issues.push({
        lineIndex: index,
        field: 'partyType',
        message: `${label}: party type is required when party id is set`,
      });
    }
  });

  const balanced = isJournalBalanced(totalDebit, totalCredit);
  if (args.lines.length >= 2 && !balanced) {
    issues.push({
      lineIndex: -1,
      message: 'Total debit must equal total credit',
    });
  }
  if (args.lines.length >= 2 && moneyEquals(totalDebit, 0)) {
    issues.push({
      lineIndex: -1,
      message: 'Journal totals must be greater than zero',
    });
  }

  return {
    ok: issues.length === 0,
    totalDebit,
    totalCredit,
    balanced,
    issues,
  };
}
