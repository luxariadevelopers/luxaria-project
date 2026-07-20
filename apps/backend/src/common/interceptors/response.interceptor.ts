import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createSuccessResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'success' in payload &&
          (payload as { success: unknown }).success === true
        ) {
          return payload;
        }

        if (
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          'message' in payload
        ) {
          const body = payload as {
            data?: unknown;
            message?: string;
            meta?: Record<string, unknown>;
          };
          return createSuccessResponse(body.data, body.message, body.meta ?? {});
        }

        return createSuccessResponse(payload);
      }),
    );
  }
}
