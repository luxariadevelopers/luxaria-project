import type { BookFilterState, CashBankBookQuery } from './types';

export type BookFilterParseResult =
  | { ok: true; value: CashBankBookQuery; state: BookFilterState }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof BookFilterState, string>>;
    };

export function emptyBookFilters(
  defaults?: Partial<BookFilterState>,
): BookFilterState {
  return {
    financialYearId: defaults?.financialYearId ?? '',
    projectId: defaults?.projectId ?? '',
    from: defaults?.from ?? '',
    to: defaults?.to ?? '',
    accountId: defaults?.accountId ?? '',
  };
}

/** Validate filter form before calling Nest accounting-reports. */
export function parseBookFilters(state: BookFilterState): BookFilterParseResult {
  const fieldErrors: Partial<Record<keyof BookFilterState, string>> = {};
  const financialYearId = state.financialYearId.trim();
  if (!financialYearId) {
    fieldErrors.financialYearId = 'Financial year is required';
  }

  const from = state.from.trim();
  const to = state.to.trim();
  if (from && to && from > to) {
    fieldErrors.to = 'To must be on or after From';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    state,
    value: {
      financialYearId,
      projectId: state.projectId.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
      accountId: state.accountId.trim() || undefined,
    },
  };
}
