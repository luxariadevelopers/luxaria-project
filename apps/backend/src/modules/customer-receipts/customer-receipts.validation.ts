import { BadRequestException } from '@nestjs/common';
import {
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
} from './schemas/customer-receipt.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeTransactionReference(
  value?: string | null,
): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length < 3) {
    throw new BadRequestException(
      'transactionReference must be at least 3 characters',
    );
  }
  return normalized;
}

export function assertSourceTypeRules(input: {
  sourceType: CustomerReceiptSourceType;
  loanBank?: string | null;
}): void {
  if (
    input.sourceType === CustomerReceiptSourceType.BankLoan &&
    !input.loanBank?.trim()
  ) {
    throw new BadRequestException(
      'loanBank is required when sourceType is bank_loan',
    );
  }
}

export function assertPaymentModeBankFields(input: {
  paymentMode: CustomerReceiptPaymentMode;
  companyBankAccountId?: string | null;
  transactionReference?: string | null;
}): void {
  const needsBank =
    input.paymentMode !== CustomerReceiptPaymentMode.Cash &&
    input.paymentMode !== CustomerReceiptPaymentMode.Other;

  if (needsBank && !input.companyBankAccountId) {
    throw new BadRequestException(
      'companyBankAccountId is required for this paymentMode',
    );
  }
  if (needsBank && !input.transactionReference?.trim()) {
    throw new BadRequestException(
      'transactionReference is required for this paymentMode',
    );
  }
}

export function assertAllocationTotals(input: {
  amount: number;
  allocations: Array<{ amount: number }>;
}): { allocatedAmount: number; unallocatedAmount: number } {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new BadRequestException('amount must be greater than zero');
  }

  let allocatedAmount = 0;
  for (const line of input.allocations) {
    if (!Number.isFinite(line.amount) || line.amount <= 0) {
      throw new BadRequestException(
        'Each scheduleAllocation amount must be greater than zero',
      );
    }
    allocatedAmount += line.amount;
  }
  allocatedAmount = roundMoney(allocatedAmount);

  if (allocatedAmount - input.amount > 0.009) {
    throw new BadRequestException(
      `Allocated amount (${allocatedAmount}) cannot exceed receipt amount (${input.amount})`,
    );
  }

  return {
    allocatedAmount,
    unallocatedAmount: roundMoney(input.amount - allocatedAmount),
  };
}
