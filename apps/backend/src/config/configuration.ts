export type AppConfig = {
  nodeEnv: string;
  port: number;
  appName: string;
  appVersion: string;
  mongodbUri: string;
  corsOrigins: string[];
  swaggerEnabled: boolean;
  logLevel: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  authMaxFailedAttempts: number;
  authLockMinutes: number;
  /** Secure cookie flag for refresh tokens (true in production). */
  authCookieSecure: boolean;
  authCookieSameSite: 'strict' | 'lax' | 'none';
  authCookieDomain: string | null;
  fieldEncryptionKey: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsBucketName: string;
  awsS3Prefix: string;
  awsS3MaxUploadBytes: number;
  awsS3PresignExpiresSeconds: number;
  /** Max % over PO qty allowed on receipt (e.g. 5 = 5%). */
  purchaseOrderReceiveTolerancePercent: number;
  /** When false, stock ledger posts cannot drive balance below zero. */
  stockAllowNegative: boolean;
  /**
   * Absolute variance % of system qty that escalates a stock count
   * to director approval (e.g. 10 = 10%).
   */
  stockCountDirectorThresholdPercent: number;
  /**
   * Absolute variance % of expected material consumption that requires
   * explanation + approval (e.g. 5 = 5%).
   */
  materialConsumptionVarianceThresholdPercent: number;
  /** Lookback window (days) for average daily consumption. */
  stockForecastLookbackDays: number;
  /** Alert when estimated stock-out is within this many days. */
  stockStockoutAlertDays: number;
  /** Days with stock but no consumption → slow-moving alert. */
  stockSlowMovingDays: number;
  /** Enable scheduled reorder / forecast background jobs. */
  stockReorderJobsEnabled: boolean;
  /** Cron expression for reorder evaluation (default: daily 06:00). */
  stockReorderCron: string;
  /** Enable scheduled missing-DPR alert jobs. */
  dprMissingJobsEnabled: boolean;
  /** Cron expression for missing-DPR evaluation (default: daily 20:00). */
  dprMissingCron: string;
  /** Enable scheduled contractor-agreement expiry alert jobs. */
  contractorAgreementExpiryJobsEnabled: boolean;
  /** Cron expression for agreement expiry evaluation (default: daily 07:00). */
  contractorAgreementExpiryCron: string;
  /** Days before endDate to raise first expiry warning. */
  contractorAgreementExpiryWarningDays: number;
  /** Hours before a booking hold expires automatically. */
  bookingHoldHours: number;
  /** Enable scheduled booking-hold expiry jobs. */
  bookingHoldExpiryJobsEnabled: boolean;
  /** Cron expression for hold expiry (default: every 15 minutes). */
  bookingHoldExpiryCron: string;
  /** Discount % of agreedPrice that may be applied without approval. */
  bookingDiscountPercentLimit: number;
  /** Absolute discount amount that may be applied without approval. */
  bookingDiscountAmountLimit: number;
  /** Enable scheduled payment-schedule overdue jobs. */
  paymentScheduleOverdueJobsEnabled: boolean;
  /** Cron expression for overdue evaluation (default: daily 01:00). */
  paymentScheduleOverdueCron: string;
  /** Enable scheduled manpower shortfall alert jobs. */
  manpowerShortfallJobsEnabled: boolean;
  /** Cron expression for manpower shortfall evaluation (default: daily 21:00). */
  manpowerShortfallCron: string;
  /** Enable scheduled daily director digest jobs. */
  directorDigestJobsEnabled: boolean;
  /** Cron expression for morning director digest (default: daily 08:00). */
  directorDigestCron: string;
  /** When true, enqueue BullMQ jobs via Redis instead of inline cron work. */
  redisEnabled: boolean;
  /** When true, deliver push via Expo instead of stub logging. */
  pushEnabled: boolean;
  /** Optional Expo push access token for higher rate limits. */
  expoAccessToken: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  /** Max % invoice qty may exceed GRN accepted qty before exception. */
  vendorInvoiceQtyTolerancePercent: number;
  /** Max % invoice rate may differ from PO rate before exception. */
  vendorInvoiceRateTolerancePercent: number;
  vendorInvoiceTaxTolerancePercent: number;
  vendorInvoiceFreightTolerancePercent: number;
  vendorInvoiceDiscountTolerancePercent: number;
  vendorInvoiceTotalTolerancePercent: number;
  /** SMTP host — when unset, email channel runs in stub mode (local/dev). */
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  /** Use TLS (typical for port 465). Defaults from port when unset. */
  smtpSecure: boolean;
  /** From address for outbound notification emails. */
  emailFrom: string;
};

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const corsOrigins = String(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const sameSiteRaw = String(process.env.AUTH_COOKIE_SAME_SITE ?? 'lax')
    .trim()
    .toLowerCase();
  const authCookieSameSite =
    sameSiteRaw === 'strict' || sameSiteRaw === 'none' || sameSiteRaw === 'lax'
      ? sameSiteRaw
      : 'lax';

  return {
    nodeEnv,
    port: Number(process.env.PORT ?? 9000),
    appName: process.env.APP_NAME ?? 'Luxaria Developers ERP API',
    appVersion: process.env.APP_VERSION ?? '0.1.0',
    mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:9017/luxaria-erp',
    corsOrigins:
      corsOrigins.length > 0
        ? corsOrigins
        : ['http://localhost:9001', 'http://localhost:9002'],
    swaggerEnabled: String(process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() !== 'false',
    logLevel: process.env.LOG_LEVEL ?? 'debug',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'luxaria-dev-access-secret-change-me',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'luxaria-dev-refresh-secret-change-me',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    authMaxFailedAttempts: Number(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? 5),
    authLockMinutes: Number(process.env.AUTH_LOCK_MINUTES ?? 30),
    authCookieSecure:
      String(process.env.AUTH_COOKIE_SECURE ?? '').toLowerCase() === 'true' ||
      nodeEnv === 'production',
    authCookieSameSite,
    authCookieDomain: process.env.AUTH_COOKIE_DOMAIN?.trim() || null,
    fieldEncryptionKey:
      process.env.FIELD_ENCRYPTION_KEY ??
      'luxaria-dev-field-encryption-key-change-me-32b',
    awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    awsBucketName: process.env.AWS_BUCKET_NAME ?? '',
    awsS3Prefix: process.env.AWS_S3_PREFIX ?? 'luxaria-developers/',
    awsS3MaxUploadBytes: Number(
      process.env.AWS_S3_MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024,
    ),
    awsS3PresignExpiresSeconds: Number(
      process.env.AWS_S3_PRESIGN_EXPIRES_SECONDS ?? 900,
    ),
    purchaseOrderReceiveTolerancePercent: Number(
      process.env.PO_RECEIVE_TOLERANCE_PERCENT ?? 5,
    ),
    stockAllowNegative:
      String(process.env.STOCK_ALLOW_NEGATIVE ?? 'false').toLowerCase() ===
      'true',
    stockCountDirectorThresholdPercent: Number(
      process.env.STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT ?? 10,
    ),
    materialConsumptionVarianceThresholdPercent: Number(
      process.env.MATERIAL_CONSUMPTION_VARIANCE_THRESHOLD_PERCENT ?? 5,
    ),
    stockForecastLookbackDays: Number(
      process.env.STOCK_FORECAST_LOOKBACK_DAYS ?? 30,
    ),
    stockStockoutAlertDays: Number(process.env.STOCK_STOCKOUT_ALERT_DAYS ?? 3),
    stockSlowMovingDays: Number(process.env.STOCK_SLOW_MOVING_DAYS ?? 45),
    stockReorderJobsEnabled:
      String(process.env.STOCK_REORDER_JOBS_ENABLED ?? 'true').toLowerCase() !==
      'false',
    stockReorderCron: process.env.STOCK_REORDER_CRON ?? '0 6 * * *',
    dprMissingJobsEnabled:
      String(process.env.DPR_MISSING_JOBS_ENABLED ?? 'true').toLowerCase() !==
      'false',
    dprMissingCron: process.env.DPR_MISSING_CRON ?? '0 20 * * *',
    contractorAgreementExpiryJobsEnabled:
      String(
        process.env.CONTRACTOR_AGREEMENT_EXPIRY_JOBS_ENABLED ?? 'true',
      ).toLowerCase() !== 'false',
    contractorAgreementExpiryCron:
      process.env.CONTRACTOR_AGREEMENT_EXPIRY_CRON ?? '0 7 * * *',
    contractorAgreementExpiryWarningDays: Number(
      process.env.CONTRACTOR_AGREEMENT_EXPIRY_WARNING_DAYS ?? 30,
    ),
    bookingHoldHours: Number(process.env.BOOKING_HOLD_HOURS ?? 48),
    bookingHoldExpiryJobsEnabled:
      String(
        process.env.BOOKING_HOLD_EXPIRY_JOBS_ENABLED ?? 'true',
      ).toLowerCase() !== 'false',
    bookingHoldExpiryCron:
      process.env.BOOKING_HOLD_EXPIRY_CRON ?? '*/15 * * * *',
    bookingDiscountPercentLimit: Number(
      process.env.BOOKING_DISCOUNT_PERCENT_LIMIT ?? 5,
    ),
    bookingDiscountAmountLimit: Number(
      process.env.BOOKING_DISCOUNT_AMOUNT_LIMIT ?? 500_000,
    ),
    paymentScheduleOverdueJobsEnabled:
      String(
        process.env.PAYMENT_SCHEDULE_OVERDUE_JOBS_ENABLED ?? 'true',
      ).toLowerCase() !== 'false',
    paymentScheduleOverdueCron:
      process.env.PAYMENT_SCHEDULE_OVERDUE_CRON ?? '0 1 * * *',
    manpowerShortfallJobsEnabled:
      String(
        process.env.MANPOWER_SHORTFALL_JOBS_ENABLED ?? 'true',
      ).toLowerCase() !== 'false',
    manpowerShortfallCron:
      process.env.MANPOWER_SHORTFALL_CRON ?? '0 21 * * *',
    directorDigestJobsEnabled:
      String(
        process.env.DIRECTOR_DIGEST_JOBS_ENABLED ?? 'true',
      ).toLowerCase() !== 'false',
    directorDigestCron: process.env.DIRECTOR_DIGEST_CRON ?? '0 8 * * *',
    redisEnabled:
      String(process.env.REDIS_ENABLED ?? 'false').toLowerCase() === 'true',
    pushEnabled:
      String(process.env.PUSH_ENABLED ?? 'false').toLowerCase() === 'true',
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? '',
    redisHost: process.env.REDIS_HOST ?? '127.0.0.1',
    redisPort: Number(process.env.REDIS_PORT ?? 9018),
    redisPassword: process.env.REDIS_PASSWORD ?? '',
    vendorInvoiceQtyTolerancePercent: Number(
      process.env.VENDOR_INVOICE_QTY_TOLERANCE_PERCENT ?? 0,
    ),
    vendorInvoiceRateTolerancePercent: Number(
      process.env.VENDOR_INVOICE_RATE_TOLERANCE_PERCENT ?? 0,
    ),
    vendorInvoiceTaxTolerancePercent: Number(
      process.env.VENDOR_INVOICE_TAX_TOLERANCE_PERCENT ?? 0,
    ),
    vendorInvoiceFreightTolerancePercent: Number(
      process.env.VENDOR_INVOICE_FREIGHT_TOLERANCE_PERCENT ?? 0,
    ),
    vendorInvoiceDiscountTolerancePercent: Number(
      process.env.VENDOR_INVOICE_DISCOUNT_TOLERANCE_PERCENT ?? 0,
    ),
    vendorInvoiceTotalTolerancePercent: Number(
      process.env.VENDOR_INVOICE_TOTAL_TOLERANCE_PERCENT ?? 0,
    ),
    smtpHost: process.env.SMTP_HOST?.trim() ?? '',
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.SMTP_USER?.trim() ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    smtpSecure:
      String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' ||
      Number(process.env.SMTP_PORT ?? 587) === 465,
    emailFrom: process.env.EMAIL_FROM?.trim() ?? '',
  };
};
