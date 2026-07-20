import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Schema, connect, disconnect } from 'mongoose';
import { withTransaction } from './transaction.helper';

type CounterDoc = {
  name: string;
  value: number;
};

describe('withTransaction', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let CounterModel: Model<CounterDoc>;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;

    const schema = new Schema<CounterDoc>({
      name: { type: String, required: true, unique: true },
      value: { type: Number, required: true, default: 0 },
    });
    CounterModel = connection.model<CounterDoc>('CounterTxn', schema);
  }, 120_000);

  afterAll(async () => {
    await disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await CounterModel.deleteMany({});
  });

  it('commits work inside a transaction', async () => {
    await withTransaction(connection, async (session) => {
      await CounterModel.create([{ name: 'cash', value: 10 }], { session });
    });

    const doc = await CounterModel.findOne({ name: 'cash' });
    expect(doc?.value).toBe(10);
  });

  it('rolls back when work throws', async () => {
    await expect(
      withTransaction(connection, async (session) => {
        await CounterModel.create([{ name: 'bank', value: 5 }], { session });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    const doc = await CounterModel.findOne({ name: 'bank' });
    expect(doc).toBeNull();
  });
});
