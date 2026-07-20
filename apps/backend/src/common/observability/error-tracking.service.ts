import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { redactObject, redactString } from '../logging/log-redaction';
import {
  isErrorTrackingActive,
  parseAlertConfig,
  type AlertConfig,
} from './alert-config';

export type ErrorTrackingContext = {
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  extra?: Record<string, unknown>;
};

@Injectable()
export class ErrorTrackingService implements OnModuleInit {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private alertConfig!: AlertConfig;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.alertConfig = parseAlertConfig({
      ...process.env,
      ERROR_TRACKING_ENABLED: String(
        this.configService.get<AppConfig['errorTrackingEnabled']>(
          'errorTrackingEnabled',
        ) ?? false,
      ),
      ERROR_TRACKING_DSN:
        this.configService.get<AppConfig['errorTrackingDsn']>('errorTrackingDsn') ??
        undefined,
      OPS_ALERT_WEBHOOK_URL:
        this.configService.get<AppConfig['opsAlertWebhookUrl']>(
          'opsAlertWebhookUrl',
        ) ?? undefined,
    });
  }

  isEnabled(): boolean {
    return isErrorTrackingActive(this.alertConfig);
  }

  captureException(error: unknown, context: ErrorTrackingContext = {}): void {
    const message = this.extractMessage(error);
    const payload = {
      message: redactString(message),
      requestId: context.requestId,
      path: context.path,
      method: context.method,
      statusCode: context.statusCode,
      userId: context.userId,
      extra: context.extra ? redactObject(context.extra) : undefined,
      stack:
        error instanceof Error
          ? redactString(error.stack ?? message)
          : undefined,
    };

    this.logger.error(
      `Captured error requestId=${context.requestId ?? 'n/a'}: ${payload.message}`,
      error instanceof Error ? error.stack : undefined,
    );

    if (!this.isEnabled()) {
      return;
    }

    void this.dispatch(payload).catch((dispatchError: unknown) => {
      this.logger.warn(
        `Error tracking dispatch failed: ${this.extractMessage(dispatchError)}`,
      );
    });
  }

  private async dispatch(payload: Record<string, unknown>): Promise<void> {
    const dsn = this.alertConfig.errorTrackingDsn;
    if (!dsn) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);

    try {
      await fetch(dsn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          ...payload,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }
}
