/**
 * Parse Nest soft-warning strings from
 * `SiteExpenseVouchersService.buildWarnings`.
 */

export function hasGpsWarning(warnings: readonly string[]): boolean {
  return warnings.some((w) => /outside project radius/i.test(w));
}

export function hasDuplicateBillWarning(warnings: readonly string[]): boolean {
  return warnings.some((w) => /possible duplicate bill/i.test(w));
}

export function hasBackdatedWarning(warnings: readonly string[]): boolean {
  return warnings.some((w) => /backdated/i.test(w));
}

export function gpsWarningText(warnings: readonly string[]): string | null {
  return warnings.find((w) => /outside project radius/i.test(w)) ?? null;
}

export function duplicateBillWarningText(
  warnings: readonly string[],
): string | null {
  return warnings.find((w) => /possible duplicate bill/i.test(w)) ?? null;
}

export function evidenceCount(
  row: Pick<{ attachments: readonly unknown[] }, 'attachments'>,
): number {
  return row.attachments?.length ?? 0;
}
