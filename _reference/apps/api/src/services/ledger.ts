import mongoose, { ClientSession, Types } from 'mongoose';
import { Account, LedgerEntry } from '../models';

export async function postLedger(params: {
  companyId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string;
  debitAccountId: Types.ObjectId | string;
  creditAccountId: Types.ObjectId | string;
  amountPaise: number;
  narration: string;
  refType: string;
  refId?: Types.ObjectId | string;
  createdBy: Types.ObjectId | string;
  session?: ClientSession | null;
}) {
  const session = params.session || undefined;
  const debitQ = Account.findById(params.debitAccountId);
  const creditQ = Account.findById(params.creditAccountId);
  if (session) {
    debitQ.session(session);
    creditQ.session(session);
  }
  const debit = await debitQ;
  const credit = await creditQ;
  if (!debit || !credit) throw new Error('Account not found');

  debit.balancePaise += params.amountPaise;
  credit.balancePaise -= params.amountPaise;
  await debit.save(session ? { session } : undefined);
  await credit.save(session ? { session } : undefined);

  const payload = {
    companyId: params.companyId,
    projectId: params.projectId,
    debitAccountId: params.debitAccountId,
    creditAccountId: params.creditAccountId,
    amountPaise: params.amountPaise,
    narration: params.narration,
    refType: params.refType,
    refId: params.refId,
    createdBy: params.createdBy,
  };
  if (session) {
    const [entry] = await LedgerEntry.create([payload], { session });
    return entry;
  }
  return LedgerEntry.create(payload);
}

export function sessionOpt(session: ClientSession | null | undefined) {
  return session ? { session } : {};
}

export async function createOne<T>(
  Model: { create: (...args: any[]) => Promise<any> },
  doc: object,
  session: ClientSession | null | undefined
): Promise<T> {
  if (session) {
    const [row] = await Model.create([doc], { session });
    return row as T;
  }
  return (await Model.create(doc)) as T;
}

export async function withTransaction<T>(fn: (session: ClientSession | null) => Promise<T>): Promise<T> {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    // Standalone Mongo (no replica set) — run without multi-doc transaction
    const msg = (err as Error).message || '';
    if (msg.includes('Transaction numbers') || msg.includes('replica set') || msg.includes('mongos')) {
      return fn(null);
    }
    // If startSession itself fails similarly, fall back
    return fn(null);
  }
}
