import * as SQLite from 'expo-sqlite';

const DB_NAME = 'luxaria-offline.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const MIGRATION_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS offline_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  project_id TEXT,
  created_by_user_id TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_error_code TEXT,
  failure_kind TEXT,
  device_timestamp TEXT NOT NULL,
  server_timestamp TEXT,
  server_record_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  next_retry_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_offline_txn_status
  ON offline_transactions(status);

CREATE INDEX IF NOT EXISTS idx_offline_txn_retry
  ON offline_transactions(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_offline_txn_owner
  ON offline_transactions(created_by_user_id);

CREATE TABLE IF NOT EXISTS offline_media (
  id TEXT PRIMARY KEY NOT NULL,
  transaction_id TEXT NOT NULL,
  local_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  upload_status TEXT NOT NULL,
  server_document_id TEXT,
  last_error TEXT,
  upload_meta_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES offline_transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_offline_media_txn
  ON offline_media(transaction_id);
`;

type ColumnInfo = { name: string };

async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const cols = await db.getAllAsync<ColumnInfo>(`PRAGMA table_info(${table})`);
  if (cols.some((c) => c.name === column)) {
    return;
  }
  await db.execAsync(
    `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
  );
}

async function migrateSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(MIGRATION_SQL);
  await ensureColumn(db, 'offline_transactions', 'created_by_user_id', 'TEXT');
  await ensureColumn(db, 'offline_transactions', 'last_error_code', 'TEXT');
  await ensureColumn(db, 'offline_transactions', 'failure_kind', 'TEXT');
}

export async function getOfflineDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrateSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Test helper — reset singleton between suites if needed. */
export function resetOfflineDatabaseSingleton() {
  dbPromise = null;
}
