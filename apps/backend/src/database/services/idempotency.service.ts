import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyStatus,
} from '../schemas/idempotency-key.schema';

export const CONTRIBUTION_RECEIPT_IDEMPOTENCY_SCOPE = 'contribution.receipt';
export const JOURNAL_ENTRY_IDEMPOTENCY_SCOPE = 'journal.entry';
export const PETTY_CASH_FUND_TRANSFER_IDEMPOTENCY_SCOPE =
  'petty_cash.fund_transfer';
export const SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE = 'site_expense.voucher';
export const SIGNED_PAYMENT_VOUCHER_IDEMPOTENCY_SCOPE =
  'signed_payment.voucher';
export const GOODS_RECEIPT_IDEMPOTENCY_SCOPE = 'goods_receipt';
export const DPR_IDEMPOTENCY_SCOPE = 'daily_progress_report';
export const LABOUR_ATTENDANCE_IDEMPOTENCY_SCOPE = 'labour_attendance';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotencyBeginResult =
  | { outcome: 'proceed' }
  | { outcome: 'replay'; response: Record<string, unknown> };

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectModel(IdempotencyKey.name)
    private readonly idempotencyModel: Model<IdempotencyKey>,
  ) {}

  hashRequest(payload: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(payload ?? {}))
      .digest('hex');
  }

  /**
   * Begin an idempotent operation. Replays completed responses; blocks concurrent processing.
   */
  async begin(input: {
    key: string;
    scope: string;
    userId?: string | null;
    requestHash?: string | null;
    ttlMs?: number;
  }): Promise<IdempotencyBeginResult> {
    const key = input.key.trim();
    if (!key) {
      throw new UnprocessableEntityException('Idempotency-Key is required');
    }

    const existing = await this.idempotencyModel
      .findOne({ key, scope: input.scope })
      .exec();

    if (existing) {
      if (existing.status === IdempotencyStatus.Completed && existing.responseSnapshot) {
        if (
          input.requestHash &&
          existing.requestHash &&
          existing.requestHash !== input.requestHash
        ) {
          throw new ConflictException(
            'Idempotency-Key reused with a different request payload',
          );
        }
        return { outcome: 'replay', response: existing.responseSnapshot };
      }
      if (existing.status === IdempotencyStatus.Processing) {
        throw new ConflictException(
          'A request with this Idempotency-Key is already processing',
        );
      }
      // Failed — allow retry by resetting
      existing.status = IdempotencyStatus.Processing;
      existing.requestHash = input.requestHash ?? existing.requestHash;
      existing.responseSnapshot = null;
      existing.expiresAt = new Date(Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS));
      if (input.userId) existing.userId = new Types.ObjectId(input.userId);
      await existing.save();
      return { outcome: 'proceed' };
    }

    await this.idempotencyModel.create({
      key,
      scope: input.scope,
      status: IdempotencyStatus.Processing,
      requestHash: input.requestHash ?? null,
      responseSnapshot: null,
      userId: input.userId ? new Types.ObjectId(input.userId) : null,
      expiresAt: new Date(Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS)),
    });

    return { outcome: 'proceed' };
  }

  async complete(
    key: string,
    scope: string,
    response: Record<string, unknown>,
  ): Promise<void> {
    await this.idempotencyModel
      .updateOne(
        { key: key.trim(), scope },
        {
          $set: {
            status: IdempotencyStatus.Completed,
            responseSnapshot: response,
          },
        },
      )
      .exec();
  }

  async fail(key: string, scope: string): Promise<void> {
    await this.idempotencyModel
      .updateOne(
        { key: key.trim(), scope },
        { $set: { status: IdempotencyStatus.Failed } },
      )
      .exec();
  }
}
