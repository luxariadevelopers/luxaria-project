import * as Crypto from 'expo-crypto';

/** Generate a UUID v4 for offline transactions and media rows. */
export function createOfflineId(): string {
  return Crypto.randomUUID();
}

/**
 * Idempotency key used on the wire.
 * Stable for the life of the local transaction to prevent duplicate server records.
 */
export function createIdempotencyKey(transactionId: string): string {
  return `mobile-txn:${transactionId}`;
}
