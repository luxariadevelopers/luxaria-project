import type { SQLiteDatabase } from 'expo-sqlite';
import { getOfflineDatabase } from './db';
import type { OfflineRepository } from './repository';
import type {
  OfflineFailureKind,
  OfflineMedia,
  OfflineTransaction,
  OfflineTxnStatus,
} from './types';

type TxnRow = {
  id: string;
  idempotency_key: string;
  type: string;
  label: string;
  project_id: string | null;
  created_by_user_id: string | null;
  endpoint: string;
  method: string;
  payload_json: string;
  status: string;
  attempt_count: number;
  last_error: string | null;
  last_error_code: string | null;
  failure_kind: string | null;
  device_timestamp: string;
  server_timestamp: string | null;
  server_record_id: string | null;
  created_at: string;
  updated_at: string;
  next_retry_at: string | null;
};

type MediaRow = {
  id: string;
  transaction_id: string;
  local_path: string;
  mime_type: string;
  file_name: string;
  field_key: string;
  upload_status: string;
  server_document_id: string | null;
  last_error: string | null;
  upload_meta_json: string | null;
  created_at: string;
  updated_at: string;
};

function mapTxn(row: TxnRow): OfflineTransaction {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    type: row.type,
    label: row.label,
    projectId: row.project_id,
    createdByUserId: row.created_by_user_id ?? null,
    endpoint: row.endpoint,
    method: row.method as OfflineTransaction['method'],
    payloadJson: row.payload_json,
    status: row.status as OfflineTxnStatus,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    lastErrorCode: row.last_error_code ?? null,
    failureKind: (row.failure_kind as OfflineFailureKind | null) ?? null,
    deviceTimestamp: row.device_timestamp,
    serverTimestamp: row.server_timestamp,
    serverRecordId: row.server_record_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextRetryAt: row.next_retry_at,
  };
}

function mapMedia(row: MediaRow): OfflineMedia {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    localPath: row.local_path,
    mimeType: row.mime_type,
    fileName: row.file_name,
    fieldKey: row.field_key,
    uploadStatus: row.upload_status as OfflineMedia['uploadStatus'],
    serverDocumentId: row.server_document_id,
    lastError: row.last_error,
    uploadMetaJson: row.upload_meta_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSqliteOfflineRepository(
  getDb: () => Promise<SQLiteDatabase> = getOfflineDatabase,
): OfflineRepository {
  return {
    async init() {
      await getDb();
    },

    async insertTransaction(txn) {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO offline_transactions (
          id, idempotency_key, type, label, project_id, created_by_user_id,
          endpoint, method, payload_json, status, attempt_count, last_error,
          last_error_code, failure_kind, device_timestamp, server_timestamp,
          server_record_id, created_at, updated_at, next_retry_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        txn.id,
        txn.idempotencyKey,
        txn.type,
        txn.label,
        txn.projectId,
        txn.createdByUserId,
        txn.endpoint,
        txn.method,
        txn.payloadJson,
        txn.status,
        txn.attemptCount,
        txn.lastError,
        txn.lastErrorCode,
        txn.failureKind,
        txn.deviceTimestamp,
        txn.serverTimestamp,
        txn.serverRecordId,
        txn.createdAt,
        txn.updatedAt,
        txn.nextRetryAt,
      );
    },

    async insertMedia(media) {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO offline_media (
          id, transaction_id, local_path, mime_type, file_name, field_key,
          upload_status, server_document_id, last_error, upload_meta_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        media.id,
        media.transactionId,
        media.localPath,
        media.mimeType,
        media.fileName,
        media.fieldKey,
        media.uploadStatus,
        media.serverDocumentId,
        media.lastError,
        media.uploadMetaJson,
        media.createdAt,
        media.updatedAt,
      );
    },

    async updateTransaction(id, patch) {
      const current = await this.getTransaction(id);
      if (!current) {
        throw new Error(`Transaction ${id} not found`);
      }
      const next = { ...current, ...patch, id: current.id };
      const db = await getDb();
      await db.runAsync(
        `UPDATE offline_transactions SET
          idempotency_key = ?, type = ?, label = ?, project_id = ?,
          created_by_user_id = ?, endpoint = ?, method = ?, payload_json = ?,
          status = ?, attempt_count = ?, last_error = ?, last_error_code = ?,
          failure_kind = ?, device_timestamp = ?, server_timestamp = ?,
          server_record_id = ?, created_at = ?, updated_at = ?, next_retry_at = ?
         WHERE id = ?`,
        next.idempotencyKey,
        next.type,
        next.label,
        next.projectId,
        next.createdByUserId,
        next.endpoint,
        next.method,
        next.payloadJson,
        next.status,
        next.attemptCount,
        next.lastError,
        next.lastErrorCode,
        next.failureKind,
        next.deviceTimestamp,
        next.serverTimestamp,
        next.serverRecordId,
        next.createdAt,
        next.updatedAt,
        next.nextRetryAt,
        id,
      );
    },

    async updateMedia(id, patch) {
      const rows = await (await getDb()).getAllAsync<MediaRow>(
        'SELECT * FROM offline_media WHERE id = ?',
        id,
      );
      const current = rows[0] ? mapMedia(rows[0]) : null;
      if (!current) {
        throw new Error(`Media ${id} not found`);
      }
      const next = { ...current, ...patch, id: current.id };
      const db = await getDb();
      await db.runAsync(
        `UPDATE offline_media SET
          transaction_id = ?, local_path = ?, mime_type = ?, file_name = ?,
          field_key = ?, upload_status = ?, server_document_id = ?, last_error = ?,
          upload_meta_json = ?, created_at = ?, updated_at = ?
         WHERE id = ?`,
        next.transactionId,
        next.localPath,
        next.mimeType,
        next.fileName,
        next.fieldKey,
        next.uploadStatus,
        next.serverDocumentId,
        next.lastError,
        next.uploadMetaJson,
        next.createdAt,
        next.updatedAt,
        id,
      );
    },

    async getTransaction(id) {
      const db = await getDb();
      const rows = await db.getAllAsync<TxnRow>(
        'SELECT * FROM offline_transactions WHERE id = ?',
        id,
      );
      return rows[0] ? mapTxn(rows[0]) : null;
    },

    async getMediaForTransaction(transactionId) {
      const db = await getDb();
      const rows = await db.getAllAsync<MediaRow>(
        'SELECT * FROM offline_media WHERE transaction_id = ? ORDER BY created_at ASC',
        transactionId,
      );
      return rows.map(mapMedia);
    },

    async listTransactions(options) {
      const db = await getDb();
      let sql = 'SELECT * FROM offline_transactions';
      const params: string[] = [];
      const clauses: string[] = [];

      if (options?.statuses?.length) {
        clauses.push(
          `status IN (${options.statuses.map(() => '?').join(', ')})`,
        );
        params.push(...options.statuses);
      }
      if (options?.excludeSynced) {
        clauses.push(`status != 'synced'`);
      }
      if (options?.createdByUserId) {
        clauses.push(
          `(created_by_user_id IS NULL OR created_by_user_id = ?)`,
        );
        params.push(options.createdByUserId);
      }
      if (clauses.length) {
        sql += ` WHERE ${clauses.join(' AND ')}`;
      }
      sql += ' ORDER BY created_at DESC';

      const rows = await db.getAllAsync<TxnRow>(sql, ...params);
      return rows.map(mapTxn);
    },

    async countActive(options) {
      const db = await getDb();
      if (options?.createdByUserId) {
        const rows = await db.getAllAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM offline_transactions
           WHERE status != 'synced'
             AND (created_by_user_id IS NULL OR created_by_user_id = ?)`,
          options.createdByUserId,
        );
        return rows[0]?.count ?? 0;
      }
      const rows = await db.getAllAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM offline_transactions WHERE status != 'synced'`,
      );
      return rows[0]?.count ?? 0;
    },

    async claimTransaction(id, fromStatuses, toStatus, updatedAt) {
      const db = await getDb();
      const placeholders = fromStatuses.map(() => '?').join(', ');
      const result = await db.runAsync(
        `UPDATE offline_transactions
         SET status = ?, updated_at = ?
         WHERE id = ? AND status IN (${placeholders})`,
        toStatus,
        updatedAt,
        id,
        ...fromStatuses,
      );
      if (!result.changes) {
        return null;
      }
      return this.getTransaction(id);
    },

    async deleteTransaction(id) {
      const db = await getDb();
      await db.runAsync(
        'DELETE FROM offline_media WHERE transaction_id = ?',
        id,
      );
      await db.runAsync('DELETE FROM offline_transactions WHERE id = ?', id);
    },
  };
}
