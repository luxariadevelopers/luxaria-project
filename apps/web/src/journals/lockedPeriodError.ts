import { getErrorMessage, isForbiddenError } from '@/api/errors';

/**
 * Nest `FinancialYearService.assertPostingAllowed` throws ForbiddenException
 * with reasons like locked / closed FY or blocked accounting period.
 */
const LOCKED_PERIOD_RE =
  /locked|closed|accounting period|not allowed for accounting posting/i;

export function isLockedPeriodError(error: unknown): boolean {
  if (!isForbiddenError(error)) return false;
  return LOCKED_PERIOD_RE.test(getErrorMessage(error));
}

export function lockedPeriodUserMessage(error: unknown): string {
  const message = getErrorMessage(error);
  if (LOCKED_PERIOD_RE.test(message)) {
    return message;
  }
  return 'Posting is blocked for this financial year or accounting period.';
}
