import { BadRequestException } from '@nestjs/common';
import {
  assertCommitmentNotBelowReceived,
  assertPaymentSchedule,
  assertPositiveReceipt,
} from './project-commitments.validation';

describe('project-commitments.validation', () => {
  it('rejects commitment below received amount', () => {
    expect(() => assertCommitmentNotBelowReceived(1000, 500)).not.toThrow();
    expect(() => assertCommitmentNotBelowReceived(400, 500)).toThrow(
      BadRequestException,
    );
  });

  it('requires payment schedule to total commitment amount when provided', () => {
    expect(() =>
      assertPaymentSchedule(
        [
          { dueDate: '2026-01-01', amount: 400 },
          { dueDate: '2026-06-01', amount: 600 },
        ],
        1000,
      ),
    ).not.toThrow();

    expect(() =>
      assertPaymentSchedule([{ dueDate: '2026-01-01', amount: 100 }], 1000),
    ).toThrow(BadRequestException);
  });

  it('requires positive receipt amounts', () => {
    expect(() => assertPositiveReceipt(10)).not.toThrow();
    expect(() => assertPositiveReceipt(0)).toThrow(BadRequestException);
  });
});
