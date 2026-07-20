import type { BankLedgerQuery, ListCompanyBankAccountsQuery } from './types';

export const bankAccountsKeys = {
  all: ['company-bank-accounts'] as const,
  list: (query: ListCompanyBankAccountsQuery) =>
    [...bankAccountsKeys.all, 'list', query] as const,
  detail: (id: string) => [...bankAccountsKeys.all, 'detail', id] as const,
  balance: (id: string) => [...bankAccountsKeys.all, 'balance', id] as const,
  ledger: (id: string, query: BankLedgerQuery) =>
    [...bankAccountsKeys.all, 'ledger', id, query] as const,
  bankLedgerOptions: ['company-bank-accounts', 'coa-bank-ledgers'] as const,
};
