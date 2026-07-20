import { BadRequestException } from '@nestjs/common';
import { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';

const IN_TYPES = new Set<StockTransactionType>([
  StockTransactionType.OpeningStock,
  StockTransactionType.PurchaseReceipt,
  StockTransactionType.TransferIn,
  StockTransactionType.ReturnFromWork,
  StockTransactionType.Adjustment,
]);

const OUT_TYPES = new Set<StockTransactionType>([
  StockTransactionType.TransferOut,
  StockTransactionType.MaterialIssue,
  StockTransactionType.ReturnToVendor,
  StockTransactionType.Wastage,
  StockTransactionType.Damage,
  StockTransactionType.TheftOrShortage,
  StockTransactionType.Adjustment,
]);

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function assertQuantities(input: {
  transactionType: StockTransactionType;
  quantityIn: number;
  quantityOut: number;
}): void {
  if (!Number.isFinite(input.quantityIn) || input.quantityIn < 0) {
    throw new BadRequestException('quantityIn must be ≥ 0');
  }
  if (!Number.isFinite(input.quantityOut) || input.quantityOut < 0) {
    throw new BadRequestException('quantityOut must be ≥ 0');
  }

  if (input.transactionType === StockTransactionType.Adjustment) {
    if (
      (input.quantityIn > 0 && input.quantityOut > 0) ||
      (input.quantityIn === 0 && input.quantityOut === 0)
    ) {
      throw new BadRequestException(
        'Adjustment requires exactly one of quantityIn or quantityOut > 0',
      );
    }
    return;
  }

  if (input.transactionType === StockTransactionType.Reversal) {
    if (input.quantityIn === 0 && input.quantityOut === 0) {
      throw new BadRequestException('Reversal quantities cannot both be zero');
    }
    return;
  }

  const isIn = IN_TYPES.has(input.transactionType);
  const isOut = OUT_TYPES.has(input.transactionType);

  if (isIn && !isOut) {
    if (!(input.quantityIn > 0) || input.quantityOut !== 0) {
      throw new BadRequestException(
        `${input.transactionType} requires quantityIn > 0 and quantityOut = 0`,
      );
    }
  } else if (isOut && !isIn) {
    if (!(input.quantityOut > 0) || input.quantityIn !== 0) {
      throw new BadRequestException(
        `${input.transactionType} requires quantityOut > 0 and quantityIn = 0`,
      );
    }
  }
}

export function signedBaseDelta(input: {
  quantityInBase: number;
  quantityOutBase: number;
}): number {
  return roundQty(input.quantityInBase - input.quantityOutBase);
}

export function assertNonNegativeBalance(input: {
  current: number;
  delta: number;
  allowNegative: boolean;
  materialLabel?: string;
}): number {
  const next = roundQty(input.current + input.delta);
  if (!input.allowNegative && next < -1e-9) {
    const label = input.materialLabel ? ` for ${input.materialLabel}` : '';
    throw new BadRequestException(
      `Insufficient stock${label}: balance ${input.current}, delta ${input.delta}`,
    );
  }
  return next;
}

export function normalizeLocation(location?: string | null): string {
  return (location ?? '').trim();
}
