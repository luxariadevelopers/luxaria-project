import { BadRequestException } from '@nestjs/common';

const PERCENT_TOLERANCE = 0.0001;

export type HoldingLineInput = {
  directorId: string;
  numberOfShares: number;
  faceValue: number;
  percentage: number;
};

/** Active company shareholding percentages must total 100%. */
export function assertShareholdingTotals100(lines: HoldingLineInput[]): void {
  if (lines.length === 0) {
    throw new BadRequestException('At least one shareholding line is required');
  }

  const directorIds = new Set<string>();
  let totalPercentage = 0;
  let totalShares = 0;

  for (const line of lines) {
    if (directorIds.has(line.directorId)) {
      throw new BadRequestException(
        `Duplicate director in shareholding proposal: ${line.directorId}`,
      );
    }
    directorIds.add(line.directorId);

    if (!Number.isFinite(line.numberOfShares) || line.numberOfShares < 0) {
      throw new BadRequestException('numberOfShares must be a non-negative number');
    }
    if (!Number.isFinite(line.faceValue) || line.faceValue < 0) {
      throw new BadRequestException('faceValue must be a non-negative number');
    }
    if (
      !Number.isFinite(line.percentage) ||
      line.percentage < 0 ||
      line.percentage > 100
    ) {
      throw new BadRequestException('percentage must be between 0 and 100');
    }

    totalPercentage += line.percentage;
    totalShares += line.numberOfShares;
  }

  if (Math.abs(totalPercentage - 100) > PERCENT_TOLERANCE) {
    throw new BadRequestException(
      `Active shareholding percentages must total 100% (got ${totalPercentage.toFixed(4)}%)`,
    );
  }

  if (totalShares <= 0) {
    throw new BadRequestException('Total numberOfShares must be greater than zero');
  }
}

export const DIN_REGEX = /^[0-9]{8}$/;

export function assertValidDin(value: string | null): void {
  if (value && !DIN_REGEX.test(value)) {
    throw new BadRequestException('DIN must be an 8-digit number');
  }
}
