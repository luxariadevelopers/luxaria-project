import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import { connect, disconnect } from 'mongoose';

export type MemoryMongo = {
  uri: string;
  stop: () => Promise<void>;
};

/** Standalone Mongo (unit / most service specs). */
export async function startMemoryMongo(): Promise<MemoryMongo> {
  const server = await MongoMemoryServer.create();
  return {
    uri: server.getUri(),
    stop: async () => {
      await server.stop();
    },
  };
}

/** Replica set for multi-document transactions. */
export async function startMemoryReplicaSet(): Promise<MemoryMongo> {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  return {
    uri: replSet.getUri(),
    stop: async () => {
      await replSet.stop();
    },
  };
}

export async function connectMongoose(uri: string): Promise<Connection> {
  const mongoose = await connect(uri);
  return mongoose.connection;
}

export async function disconnectMongoose(): Promise<void> {
  await disconnect().catch(() => undefined);
}
