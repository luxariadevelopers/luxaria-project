import { BadRequestException } from '@nestjs/common';

export const MONEY_EPS = 0.005;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyEquals(a: number, b: number): boolean {
  return Math.abs(roundMoney(a) - roundMoney(b)) < MONEY_EPS;
}

export type RawJournalLine = {
  accountId: string;
  debit?: number;
  credit?: number;
  projectId?: string | null;
  blockId?: string | null;
  costCentreId?: string | null;
  boqItemId?: string | null;
  partyType?: string | null;
  partyId?: string | null;
  fundingSource?: string | null;
  description?: string | null;
};

export type NormalizedJournalLine = {
  accountId: string;
  debit: number;
  credit: number;
  projectId: string | null;
  blockId: string | null;
  costCentreId: string | null;
  boqItemId: string | null;
  partyType: string | null;
  partyId: string | null;
  fundingSource: string | null;
  description: string | null;
};

/**
 * Validates double-entry line rules and returns normalized amounts + totals.
 * Rule: total debit = total credit; a line cannot have both debit and credit.
 */
export function validateAndNormalizeLines(
  lines: RawJournalLine[],
): { lines: NormalizedJournalLine[]; totalDebit: number; totalCredit: number } {
  if (!lines?.length || lines.length < 2) {
    throw new BadRequestException(
      'A journal entry requires at least two lines',
    );
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const normalized: NormalizedJournalLine[] = [];

  lines.forEach((line, index) => {
    const label = `Line ${index + 1}`;
    if (!line.accountId) {
      throw new BadRequestException(`${label}: accountId is required`);
    }

    const debit = roundMoney(Number(line.debit ?? 0));
    const credit = roundMoney(Number(line.credit ?? 0));

    if (Number.isNaN(debit) || Number.isNaN(credit) || debit < 0 || credit < 0) {
      throw new BadRequestException(
        `${label}: debit and credit must be non-negative numbers`,
      );
    }
    if (debit > 0 && credit > 0) {
      throw new BadRequestException(
        `${label}: a line cannot contain both debit and credit`,
      );
    }
    if (debit === 0 && credit === 0) {
      throw new BadRequestException(
        `${label}: either debit or credit must be greater than zero`,
      );
    }

    totalDebit = roundMoney(totalDebit + debit);
    totalCredit = roundMoney(totalCredit + credit);

    normalized.push({
      accountId: line.accountId,
      debit,
      credit,
      projectId: line.projectId ?? null,
      blockId: line.blockId ?? null,
      costCentreId: line.costCentreId ?? null,
      boqItemId: line.boqItemId ?? null,
      partyType: line.partyType ?? null,
      partyId: line.partyId ?? null,
      fundingSource: line.fundingSource ?? null,
      description: line.description?.trim() ?? null,
    });
  });

  if (!moneyEquals(totalDebit, totalCredit)) {
    throw new BadRequestException(
      `Total debit (${totalDebit}) must equal total credit (${totalCredit})`,
    );
  }
  if (totalDebit <= 0) {
    throw new BadRequestException('Journal totals must be greater than zero');
  }

  return { lines: normalized, totalDebit, totalCredit };
}
