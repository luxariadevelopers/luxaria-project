import { BadRequestException } from '@nestjs/common';
import {
  InstrumentType,
  ParticipantType,
  RepaymentMode,
} from './schemas/project-participant.schema';

const PERCENT_TOLERANCE = 0.0001;

const LOAN_INSTRUMENTS = new Set<InstrumentType>([
  InstrumentType.DirectorLoan,
  InstrumentType.UnsecuredLoan,
]);

export function buildParticipantKey(
  participantType: ParticipantType,
  participantId: string,
): string {
  return `${participantType}:${participantId}`;
}

/**
 * Loan interest rules:
 * - repaymentMode = lumpsum → interest optional
 * - repaymentMode = with_interest → interest required
 * - repaymentMode unset + loan instrument → interest required (legacy)
 */
export function assertInterestRateForInstrument(
  instrumentType: InstrumentType,
  interestRate: number | null | undefined,
  repaymentMode?: RepaymentMode | null,
): void {
  if (!LOAN_INSTRUMENTS.has(instrumentType)) {
    return;
  }

  if (repaymentMode === RepaymentMode.Lumpsum) {
    if (
      interestRate !== null &&
      interestRate !== undefined &&
      (!Number.isFinite(interestRate) || interestRate < 0)
    ) {
      throw new BadRequestException('interestRate must be a non-negative number');
    }
    return;
  }

  const requiresInterest =
    repaymentMode === RepaymentMode.WithInterest ||
    repaymentMode === null ||
    repaymentMode === undefined;

  if (requiresInterest) {
    if (interestRate === null || interestRate === undefined) {
      throw new BadRequestException(
        repaymentMode === RepaymentMode.WithInterest
          ? 'interestRate is required when repayment mode is with interest'
          : 'interestRate is required for loan instruments',
      );
    }
    if (!Number.isFinite(interestRate) || interestRate < 0) {
      throw new BadRequestException('interestRate must be a non-negative number');
    }
  }
}

export function assertBudgetInvestmentPercentage(
  value: number | null | undefined,
): void {
  if (value === null || value === undefined) return;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new BadRequestException(
      'budgetInvestmentPercentage must be between 0 and 100',
    );
  }
}

export function assertPercent(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new BadRequestException(`${label} must be between 0 and 100`);
  }
}

/** Active approved project profit shares must total 100% when finalising. */
export function assertActiveProfitShareTotals100(
  percentages: number[],
): void {
  if (percentages.length === 0) {
    throw new BadRequestException(
      'At least one approved active participant is required to finalise',
    );
  }

  const total = percentages.reduce((sum, p) => sum + p, 0);
  if (Math.abs(total - 100) > PERCENT_TOLERANCE) {
    throw new BadRequestException(
      `Active project profit-share percentages must total 100% when finalised (got ${total.toFixed(4)}%). This is independent of company shareholding.`,
    );
  }
}

export function isLoanInstrument(instrumentType: InstrumentType): boolean {
  return LOAN_INSTRUMENTS.has(instrumentType);
}
