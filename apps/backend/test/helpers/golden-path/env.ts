/**
 * Applies deterministic test env before AppModule is first loaded.
 * Must run before any import/require of `src/app.module`.
 */
export function applyGoldenPathEnv(mongoUri: string): void {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoUri;
  process.env.PORT = '9098';
  process.env.APP_NAME = 'Luxaria Golden Path E2E';
  process.env.APP_VERSION = '0.1.0';
  process.env.SWAGGER_ENABLED = 'false';
  process.env.LOG_LEVEL = 'error';
  process.env.REDIS_ENABLED = 'false';
  process.env.STOCK_REORDER_JOBS_ENABLED = 'false';
  process.env.DPR_MISSING_JOBS_ENABLED = 'false';
  process.env.JWT_ACCESS_SECRET =
    'luxaria-golden-path-access-secret-key-32chars';
  process.env.JWT_REFRESH_SECRET =
    'luxaria-golden-path-refresh-secret-key-32chars';
  process.env.FIELD_ENCRYPTION_KEY =
    'luxaria-dev-field-encryption-key-change-me-32b';
  process.env.CORS_ORIGINS = 'http://127.0.0.1:9001';
}
