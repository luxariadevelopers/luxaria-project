import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Schema, Types, connect, disconnect } from 'mongoose';
import { baseSchemaPlugin } from './base-schema.plugin';
import { softDeletePlugin } from './soft-delete.plugin';

type SampleDoc = {
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  softDelete?: (deletedBy?: Types.ObjectId | null) => Promise<SampleDoc>;
  restore?: () => Promise<SampleDoc>;
};

describe('softDeletePlugin + baseSchemaPlugin', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let SampleModel: Model<SampleDoc>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const schema = new Schema<SampleDoc>({ name: { type: String, required: true } });
    schema.plugin(baseSchemaPlugin);
    schema.plugin(softDeletePlugin);
    SampleModel = connection.model<SampleDoc>('SampleSoftDelete', schema);
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await SampleModel.deleteMany({}, { withDeleted: true });
  });

  it('adds base audit fields and timestamps', async () => {
    const doc = await SampleModel.create({ name: 'Site A' });
    expect(doc.isDeleted).toBe(false);
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  it('hides soft-deleted documents from default queries', async () => {
    const doc = await SampleModel.create({ name: 'Hidden' });
    await doc.softDelete?.(new Types.ObjectId());

    const visible = await SampleModel.find();
    expect(visible).toHaveLength(0);

    const withDeleted = await SampleModel.find().setOptions({ withDeleted: true });
    expect(withDeleted).toHaveLength(1);
    expect(withDeleted[0]?.isDeleted).toBe(true);
  });

  it('restores soft-deleted documents', async () => {
    const doc = await SampleModel.create({ name: 'Restore me' });
    await doc.softDelete?.();
    await doc.restore?.();

    const found = await SampleModel.findOne({ name: 'Restore me' });
    expect(found).not.toBeNull();
    expect(found?.isDeleted).toBe(false);
    expect(found?.deletedAt).toBeNull();
  });
});
