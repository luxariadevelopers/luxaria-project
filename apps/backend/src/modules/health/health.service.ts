import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import type { DatabaseHealth } from '../../database/services/database.service';
import { DatabaseService } from '../../database/services/database.service';

export type HealthPayload = {
  status: 'ok' | 'degraded';
  service: 'backend';
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  database: DatabaseHealth;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  getHealth(): HealthPayload {
    const database = this.databaseService.getHealth();
    const environment = this.configService.getOrThrow<AppConfig['nodeEnv']>('nodeEnv');

    return {
      status: database.status === 'up' ? 'ok' : 'degraded',
      service: 'backend',
      environment,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database,
    };
  }
}
