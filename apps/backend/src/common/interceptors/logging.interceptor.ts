import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { redactString } from '../logging/log-redaction';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();
    const requestId = String(request.headers[REQUEST_ID_HEADER] ?? '');
    const safeUrl = redactString(request.originalUrl);

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log(
            JSON.stringify({
              level: 'info',
              type: 'http',
              method: request.method,
              url: safeUrl,
              statusCode: response.statusCode,
              durationMs,
              requestId,
            }),
          );
        },
        error: (error: unknown) => {
          const durationMs = Date.now() - startedAt;
          const status =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof (error as { status: unknown }).status === 'number'
              ? (error as { status: number }).status
              : 500;
          this.logger.error(
            JSON.stringify({
              level: 'error',
              type: 'http',
              method: request.method,
              url: safeUrl,
              statusCode: status,
              durationMs,
              requestId,
              message: redactString(
                error instanceof Error ? error.message : 'Request failed',
              ),
            }),
          );
        },
      }),
    );
  }
}
