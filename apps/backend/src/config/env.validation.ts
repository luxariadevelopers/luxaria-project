import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { DEV_SECRET_DEFAULTS } from '../common/security/security.constants';

export enum AppEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(AppEnvironment)
  NODE_ENV!: AppEnvironment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  APP_NAME!: string;

  @IsString()
  @IsNotEmpty()
  APP_VERSION!: string;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsBoolean()
  SWAGGER_ENABLED!: boolean;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  AUTH_MAX_FAILED_ATTEMPTS?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  AUTH_LOCK_MINUTES?: number;

  @IsString()
  @IsOptional()
  AUTH_COOKIE_SAME_SITE?: string;

  @IsString()
  @IsOptional()
  AUTH_COOKIE_DOMAIN?: string;

  /** AES-256 key material for encrypting bank account numbers at rest */
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  FIELD_ENCRYPTION_KEY!: string;

  @IsString()
  @IsOptional()
  AWS_REGION?: string;

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  AWS_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  AWS_S3_PREFIX?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  AWS_S3_MAX_UPLOAD_BYTES?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  AWS_S3_PRESIGN_EXPIRES_SECONDS?: number;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function assertProductionSecrets(config: {
  NODE_ENV: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  FIELD_ENCRYPTION_KEY: string;
  CORS_ORIGINS?: string;
  SWAGGER_ENABLED: boolean;
}) {
  if (config.NODE_ENV !== AppEnvironment.Production) {
    return;
  }

  const secrets = [
    config.JWT_ACCESS_SECRET,
    config.JWT_REFRESH_SECRET,
    config.FIELD_ENCRYPTION_KEY,
  ];
  for (const secret of secrets) {
    if (DEV_SECRET_DEFAULTS.includes(secret as (typeof DEV_SECRET_DEFAULTS)[number])) {
      throw new Error(
        'Environment validation failed: production must not use development default secrets',
      );
    }
  }

  const cors = String(config.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (cors.length === 0) {
    throw new Error(
      'Environment validation failed: CORS_ORIGINS must be set in production',
    );
  }
  if (cors.some((o) => o === '*')) {
    throw new Error(
      'Environment validation failed: CORS_ORIGINS must not include "*" when credentials are enabled',
    );
  }
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const nodeEnv = String(config.NODE_ENV ?? AppEnvironment.Development);
  const isProduction = nodeEnv === AppEnvironment.Production;
  const swaggerDefault = !isProduction;

  const accessSecret = config.JWT_ACCESS_SECRET;
  const refreshSecret = config.JWT_REFRESH_SECRET;
  const fieldKey = config.FIELD_ENCRYPTION_KEY;

  if (isProduction) {
    if (!accessSecret || !refreshSecret || !fieldKey) {
      throw new Error(
        'Environment validation failed: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and FIELD_ENCRYPTION_KEY are required in production',
      );
    }
  }

  const normalized = {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: Number(config.PORT ?? 9000),
    APP_NAME: config.APP_NAME ?? 'Luxaria Developers ERP API',
    APP_VERSION: config.APP_VERSION ?? '0.1.0',
    SWAGGER_ENABLED: parseBoolean(config.SWAGGER_ENABLED, swaggerDefault),
    JWT_ACCESS_SECRET:
      accessSecret ?? 'luxaria-dev-access-secret-change-me',
    JWT_REFRESH_SECRET:
      refreshSecret ?? 'luxaria-dev-refresh-secret-change-me',
    JWT_ACCESS_EXPIRES_IN: config.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: config.JWT_REFRESH_EXPIRES_IN ?? '7d',
    AUTH_MAX_FAILED_ATTEMPTS: Number(config.AUTH_MAX_FAILED_ATTEMPTS ?? 5),
    AUTH_LOCK_MINUTES: Number(config.AUTH_LOCK_MINUTES ?? 30),
    AUTH_COOKIE_SAME_SITE: config.AUTH_COOKIE_SAME_SITE ?? 'lax',
    AUTH_COOKIE_DOMAIN: config.AUTH_COOKIE_DOMAIN ?? '',
    FIELD_ENCRYPTION_KEY:
      fieldKey ?? 'luxaria-dev-field-encryption-key-change-me-32b',
    AWS_REGION: config.AWS_REGION ?? 'ap-south-1',
    AWS_ACCESS_KEY_ID: config.AWS_ACCESS_KEY_ID ?? '',
    AWS_SECRET_ACCESS_KEY: config.AWS_SECRET_ACCESS_KEY ?? '',
    AWS_BUCKET_NAME: config.AWS_BUCKET_NAME ?? '',
    AWS_S3_PREFIX: config.AWS_S3_PREFIX ?? 'luxaria-developers/',
    AWS_S3_MAX_UPLOAD_BYTES: Number(
      config.AWS_S3_MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024,
    ),
    AWS_S3_PRESIGN_EXPIRES_SECONDS: Number(
      config.AWS_S3_PRESIGN_EXPIRES_SECONDS ?? 900,
    ),
  };

  assertProductionSecrets({
    NODE_ENV: String(normalized.NODE_ENV),
    JWT_ACCESS_SECRET: String(normalized.JWT_ACCESS_SECRET),
    JWT_REFRESH_SECRET: String(normalized.JWT_REFRESH_SECRET),
    FIELD_ENCRYPTION_KEY: String(normalized.FIELD_ENCRYPTION_KEY),
    CORS_ORIGINS: config.CORS_ORIGINS as string | undefined,
    SWAGGER_ENABLED: Boolean(normalized.SWAGGER_ENABLED),
  });

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return validated;
}
