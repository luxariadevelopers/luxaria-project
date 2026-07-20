import type { ClientSession, Connection } from 'mongoose';

export type TransactionWork<T> = (session: ClientSession) => Promise<T>;

/**
 * Runs work inside a MongoDB multi-document transaction.
 * Requires a replica set (Atlas provides this by default).
 */
export async function withTransaction<T>(
  connection: Connection,
  work: TransactionWork<T>,
): Promise<T> {
  const session = await connection.startSession();

  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
