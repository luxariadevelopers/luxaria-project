import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCodes } from '../constants/error-codes';
import type { ApiErrorDetailDto, ApiErrorResponseDto } from '../dto/api-error.dto';
import { redactString } from '../logging/log-redaction';
import { ErrorTrackingService } from '../observability/error-tracking.service';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly errorTracking: ErrorTrackingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = String(request.headers[REQUEST_ID_HEADER] ?? '');
    const timestamp = new Date().toISOString();

    const { status, errorCode, message, details } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `Unhandled error requestId=${requestId}: ${redactString(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      this.errorTracking.captureException(exception, {
        requestId,
        path: request.originalUrl,
        method: request.method,
        statusCode: status,
      });
    }

    const body: ApiErrorResponseDto = {
      success: false,
      errorCode,
      message,
      details,
      requestId,
      timestamp,
    };

    response.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    errorCode: string;
    message: string;
    details: ApiErrorDetailDto[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const details = this.extractDetails(exceptionResponse);

      return {
        status,
        errorCode: this.mapStatusToErrorCode(status),
        message: this.extractMessage(exceptionResponse, exception.message),
        details,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      details: [],
    };
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCodes.SERVICE_UNAVAILABLE;
      default:
        if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
          return ErrorCodes.VALIDATION_ERROR;
        }
        return status >= 500 ? ErrorCodes.INTERNAL_ERROR : ErrorCodes.BAD_REQUEST;
    }
  }

  private extractMessage(exceptionResponse: string | object, fallback: string): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message: string | string[] }).message;
      if (Array.isArray(message)) {
        return 'Validation failed';
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    return fallback;
  }

  private extractDetails(exceptionResponse: string | object): ApiErrorDetailDto[] {
    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      return [];
    }

    const message = (exceptionResponse as { message?: string | string[] }).message;
    if (!Array.isArray(message)) {
      return [];
    }

    return message.map((item) => ({ message: String(item) }));
  }
}
