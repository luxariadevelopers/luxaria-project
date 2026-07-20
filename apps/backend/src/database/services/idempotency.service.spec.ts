import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
  IdempotencyStatus,
} from '../schemas/idempotency-key.schema';
import {
  IdempotencyService,
  JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
} from './idempotency.service';

describe('IdempotencyService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let model: Model<IdempotencyKey>;
  let service: IdempotencyService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    model = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;
    service = new IdempotencyService(model);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await model.deleteMany({});
  });

  it('rejects empty idempotency keys', async () => {
    await expect(
      service.begin({
        key: '   ',
        scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('proceeds on first begin and replays after complete', async () => {
    const key = 'idem-1';
    const hash = service.hashRequest({ amount: 100 });

    const first = await service.begin({
      key,
      scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
      requestHash: hash,
      userId: null,
    });
    expect(first.outcome).toBe('proceed');

    const response = { success: true, data: { id: 'jv-1' } };
    await service.complete(key, JOURNAL_ENTRY_IDEMPOTENCY_SCOPE, response);

    const second = await service.begin({
      key,
      scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
      requestHash: hash,
    });
    expect(second).toEqual({ outcome: 'replay', response });
  });

  it('blocks concurrent processing for the same key', async () => {
    const key = 'idem-busy';
    await service.begin({
      key,
      scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
      requestHash: 'h1',
    });

    await expect(
      service.begin({
        key,
        scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
        requestHash: 'h1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects reuse of a completed key with a different payload hash', async () => {
    const key = 'idem-diff';
    await service.begin({
      key,
      scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
      requestHash: 'hash-a',
    });
    await service.complete(key, JOURNAL_ENTRY_IDEMPOTENCY_SCOPE, {
      ok: true,
    });

    await expect(
      service.begin({
        key,
        scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
        requestHash: 'hash-b',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows retry after fail', async () => {
    const key = 'idem-fail';
    await service.begin({
      key,
      scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
      requestHash: 'h',
    });
    await service.fail(key, JOURNAL_ENTRY_IDEMPOTENCY_SCOPE);

    const row = await model.findOne({ key }).lean();
    expect(row?.status).toBe(IdempotencyStatus.Failed);

    const again = await service.begin({
      key,
      scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
      requestHash: 'h',
    });
    expect(again.outcome).toBe('proceed');
  });
});
