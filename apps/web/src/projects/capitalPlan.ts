import {
  createParticipant,
  createParticipantVersion,
  fetchActiveParticipants,
  fetchParticipantHistory,
  updateParticipant,
} from '@/project-participants/api';
import {
  InstrumentType,
  ParticipantApprovalStatus,
  ParticipantType,
  RepaymentMode,
  type CreateParticipantInput,
  type PublicProjectParticipant,
} from '@/project-participants/types';
import type { ProjectFormValues } from './validation';

export type CapitalDirectorRow = {
  directorId: string;
  profitSharePercent: string;
  commitmentAmount: string;
};

export type CapitalInvestorRow = {
  investorId: string;
  budgetInvestmentPercentage: string;
  commitmentAmount: string;
  profitSharePercent: string;
  instrumentType: typeof InstrumentType.ProjectInvestment | typeof InstrumentType.UnsecuredLoan;
  repaymentMode: '' | typeof RepaymentMode.Lumpsum | typeof RepaymentMode.WithInterest;
  interestRate: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split remaining budget equally across director count (last row absorbs remainder). */
export function equalDirectorCommitments(
  approvedBudget: number,
  directorCount: number,
  investorCommitmentTotal = 0,
): number[] {
  if (directorCount <= 0) return [];
  const remaining = Math.max(0, approvedBudget - investorCommitmentTotal);
  const base = Math.floor((remaining / directorCount) * 100) / 100;
  const amounts = Array.from({ length: directorCount }, () => base);
  const allocated = round2(base * directorCount);
  const delta = round2(remaining - allocated);
  if (amounts.length) {
    amounts[amounts.length - 1] = round2(amounts[amounts.length - 1] + delta);
  }
  return amounts;
}

function num(value: string): number {
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

function openRowForKey(
  rows: PublicProjectParticipant[],
  participantKey: string,
): PublicProjectParticipant | undefined {
  return rows.find(
    (row) =>
      row.participantKey === participantKey &&
      row.effectiveTo == null &&
      (row.status === ParticipantApprovalStatus.Draft ||
        row.status === ParticipantApprovalStatus.Submitted ||
        row.status === ParticipantApprovalStatus.Approved),
  );
}

async function upsertParticipant(
  projectId: string,
  input: CreateParticipantInput,
): Promise<void> {
  const key = `${input.participantType}:${input.participantId}`;
  const history = await fetchParticipantHistory(projectId, {
    page: 1,
    limit: 100,
    participantKey: key,
  });
  const open = openRowForKey(history.items, key);

  if (!open) {
    await createParticipant(projectId, input);
    return;
  }

  if (open.status === ParticipantApprovalStatus.Draft) {
    await updateParticipant(projectId, open.id, {
      commitmentAmount: input.commitmentAmount,
      approvedProfitSharePercentage: input.approvedProfitSharePercentage,
      lossSharePercentage: input.lossSharePercentage,
      interestRate: input.interestRate,
      budgetInvestmentPercentage: input.budgetInvestmentPercentage,
      repaymentMode: input.repaymentMode,
      instrumentType: input.instrumentType,
      notes: input.notes,
    });
    return;
  }

  if (open.status === ParticipantApprovalStatus.Approved) {
    await createParticipantVersion(projectId, open.id, {
      commitmentAmount: input.commitmentAmount,
      approvedProfitSharePercentage: input.approvedProfitSharePercentage,
      lossSharePercentage: input.lossSharePercentage,
      interestRate: input.interestRate,
      budgetInvestmentPercentage: input.budgetInvestmentPercentage,
      repaymentMode: input.repaymentMode,
      instrumentType: input.instrumentType,
      notes: input.notes,
    });
  }
  // Submitted: leave for approval workflow — do not overwrite.
}

/**
 * Persist capital plan rows as project participants (draft / new version).
 * Best-effort: skips when user lacks participant permissions (caller handles errors).
 */
export async function syncCapitalPlanFromForm(
  projectId: string,
  values: ProjectFormValues,
): Promise<{ synced: number; skipped: number }> {
  const directors = values.capitalDirectors ?? [];
  const investors = values.capitalInvestors ?? [];
  if (!directors.length && !investors.length) {
    return { synced: 0, skipped: 0 };
  }

  let synced = 0;
  let skipped = 0;

  for (const row of directors) {
    if (!row.directorId) {
      skipped += 1;
      continue;
    }
    const profit = num(row.profitSharePercent);
    const commitment = num(row.commitmentAmount);
    await upsertParticipant(projectId, {
      participantType: ParticipantType.Director,
      participantId: row.directorId,
      commitmentAmount: commitment,
      approvedProfitSharePercentage: profit,
      lossSharePercentage: profit,
      instrumentType: InstrumentType.EquityContribution,
      repaymentMode: null,
      interestRate: null,
      budgetInvestmentPercentage: null,
      notes: 'Synced from project capital plan',
    });
    synced += 1;
  }

  for (const row of investors) {
    if (!row.investorId) {
      skipped += 1;
      continue;
    }
    const profit = num(row.profitSharePercent);
    const commitment = num(row.commitmentAmount);
    const budgetPct = num(row.budgetInvestmentPercentage);
    const isLoan = row.instrumentType === InstrumentType.UnsecuredLoan;
    const repaymentMode =
      isLoan && row.repaymentMode
        ? row.repaymentMode
        : isLoan
          ? RepaymentMode.Lumpsum
          : null;
    const interestRate =
      isLoan && repaymentMode === RepaymentMode.WithInterest
        ? num(row.interestRate)
        : isLoan
          ? null
          : null;

    await upsertParticipant(projectId, {
      participantType: ParticipantType.OutsideInvestor,
      participantId: row.investorId,
      commitmentAmount: commitment,
      approvedProfitSharePercentage: profit,
      lossSharePercentage: profit,
      instrumentType: row.instrumentType,
      repaymentMode,
      interestRate,
      budgetInvestmentPercentage: budgetPct || null,
      notes: 'Synced from project capital plan',
    });
    synced += 1;
  }

  return { synced, skipped };
}

/** Prefill capital plan rows from active + draft participants. */
export async function loadCapitalPlanDefaults(projectId: string): Promise<{
  equalDirectorInvestment: boolean;
  capitalDirectors: CapitalDirectorRow[];
  capitalInvestors: CapitalInvestorRow[];
}> {
  const [active, history] = await Promise.all([
    fetchActiveParticipants(projectId).catch(() => null),
    fetchParticipantHistory(projectId, { page: 1, limit: 100 }).catch(() => null),
  ]);

  const byKey = new Map<string, PublicProjectParticipant>();
  for (const row of history?.items ?? []) {
    if (row.effectiveTo != null) continue;
    const existing = byKey.get(row.participantKey);
    if (!existing || row.version >= existing.version) {
      byKey.set(row.participantKey, row);
    }
  }
  for (const row of active?.participants ?? []) {
    byKey.set(row.participantKey, row);
  }

  const capitalDirectors: CapitalDirectorRow[] = [];
  const capitalInvestors: CapitalInvestorRow[] = [];

  for (const row of byKey.values()) {
    if (row.participantType === ParticipantType.Director) {
      capitalDirectors.push({
        directorId: row.participantId,
        profitSharePercent: String(row.approvedProfitSharePercentage ?? 0),
        commitmentAmount: String(row.commitmentAmount ?? 0),
      });
    } else if (row.participantType === ParticipantType.OutsideInvestor) {
      capitalInvestors.push({
        investorId: row.participantId,
        budgetInvestmentPercentage: String(
          row.budgetInvestmentPercentage ?? 0,
        ),
        commitmentAmount: String(row.commitmentAmount ?? 0),
        profitSharePercent: String(row.approvedProfitSharePercentage ?? 0),
        instrumentType:
          row.instrumentType === InstrumentType.UnsecuredLoan
            ? InstrumentType.UnsecuredLoan
            : InstrumentType.ProjectInvestment,
        repaymentMode:
          row.repaymentMode === RepaymentMode.WithInterest ||
          row.repaymentMode === RepaymentMode.Lumpsum
            ? row.repaymentMode
            : '',
        interestRate:
          row.interestRate == null ? '' : String(row.interestRate),
      });
    }
  }

  const directorAmounts = capitalDirectors.map((d) => num(d.commitmentAmount));
  const equalDirectorInvestment =
    directorAmounts.length >= 2 &&
    directorAmounts.every((a) => Math.abs(a - directorAmounts[0]) <= 1);

  return {
    equalDirectorInvestment,
    capitalDirectors,
    capitalInvestors,
  };
}
