import Redis from 'ioredis';
import type { AppConfig } from '../../config/configuration';

export type RedisHealth = {
  enabled: boolean;
  status: 'up' | 'down' | 'disabled';
  host: string | null;
  port: number | null;
  latencyMs: number | null;
};

export async function probeRedisHealth(config: {
  redisEnabled: boolean;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
}): Promise<RedisHealth> {
  if (!config.redisEnabled) {
    return {
      enabled: false,
      status: 'disabled',
      host: null,
      port: null,
      latencyMs: null,
    };
  }

  const client = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword || undefined,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  const startedAt = Date.now();

  try {
    await client.connect();
    await client.ping();
    return {
      enabled: true,
      status: 'up',
      host: config.redisHost,
      port: config.redisPort,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      enabled: true,
      status: 'down',
      host: config.redisHost,
      port: config.redisPort,
      latencyMs: null,
    };
  } finally {
    client.disconnect();
  }
}

export function readRedisConfig(configService: {
  getOrThrow<T>(key: string): T;
}): Pick<
  AppConfig,
  'redisEnabled' | 'redisHost' | 'redisPort' | 'redisPassword'
> {
  return {
    redisEnabled: configService.getOrThrow<AppConfig['redisEnabled']>('redisEnabled'),
    redisHost: configService.getOrThrow<AppConfig['redisHost']>('redisHost'),
    redisPort: configService.getOrThrow<AppConfig['redisPort']>('redisPort'),
    redisPassword: configService.getOrThrow<AppConfig['redisPassword']>('redisPassword'),
  };
}
