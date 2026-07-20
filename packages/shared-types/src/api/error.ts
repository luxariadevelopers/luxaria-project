/**
 * Mirrors `apps/backend/src/common/dto/api-error.dto.ts` and
 * `apps/backend/src/common/constants/error-codes.ts`.
 */

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Field-level validation / detail row from Nest exception filter. */
export type ApiErrorDetail = {
  field?: string;
  message: string;
};

/**
 * Standard API error envelope (`AllExceptionsFilter`).
 * HTTP status is on the transport layer; body always uses this shape.
 */
export type ApiError = {
  success: false;
  errorCode: ErrorCode | (string & {});
  message: string;
  details: ApiErrorDetail[];
  requestId: string;
  timestamp: string;
};

/** @deprecated Prefer `ApiError` — retained for existing client imports. */
export type ApiErrorBody = ApiError;
