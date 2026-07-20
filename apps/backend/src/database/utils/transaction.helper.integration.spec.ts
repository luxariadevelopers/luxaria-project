import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Schema, connect, disconnect } from 'mongoose';
import { withTransaction } from './transaction.helper';

class TxProbe {
  key!: string;
  value!: number;
}

const TxProbeSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { collection: 'tx_probes' },
);

describe('withTransaction helper (integration)', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let model: Model<TxProbe>;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;
    model = connection.model(TxProbe.name, TxProbeSchema) as Model<TxProbe>;
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    await model.deleteMany({});
  });

  it('commits multi-document writes', async () => {
    await withTransaction(connection, async (session) => {
      await model.create([{ key: 'a', value: 1 }], { session });
      await model.create([{ key: 'b', value: 2 }], { session });
    });

    expect(await model.countDocuments()).toBe(2);
  });

  it('aborts all writes on error', async () => {
    await expect(
      withTransaction(connection, async (session) => {
        await model.create([{ key: 'x', value: 9 }], { session });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await model.countDocuments()).toBe(0);
  });
});
