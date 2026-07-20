import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import type { IdempotencyKey } from './idempotency-key.schema';
import {
  IdempotencyKeySchema,
  IdempotencyStatus,
} from './idempotency-key.schema';

describe('IdempotencyKey schema', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let IdempotencyKeyModel: Model<IdempotencyKey>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    IdempotencyKeyModel = connection.model<IdempotencyKey>(
      'IdempotencyKeyTest',
      IdempotencyKeySchema,
    );
    await IdempotencyKeyModel.syncIndexes();
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await IdempotencyKeyModel.deleteMany({}, { withDeleted: true });
  });

  it('stores idempotency keys with unique key+scope', async () => {
    const expiresAt = new Date(Date.now() + 60_000);

    await IdempotencyKeyModel.create({
      key: 'req-001',
      scope: 'contribution.receipt',
      status: IdempotencyStatus.Processing,
      expiresAt,
    });

    await expect(
      IdempotencyKeyModel.create({
        key: 'req-001',
        scope: 'contribution.receipt',
        status: IdempotencyStatus.Processing,
        expiresAt,
      }),
    ).rejects.toThrow();
  });

  it('allows the same key in a different scope', async () => {
    const expiresAt = new Date(Date.now() + 60_000);

    await IdempotencyKeyModel.create({
      key: 'req-002',
      scope: 'expense.create',
      expiresAt,
    });

    const second = await IdempotencyKeyModel.create({
      key: 'req-002',
      scope: 'payment.release',
      expiresAt,
    });

    expect(second.scope).toBe('payment.release');
    expect(second.status).toBe(IdempotencyStatus.Processing);
  });
});
