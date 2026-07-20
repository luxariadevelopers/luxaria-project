import { ERROR_CODES, type ApiError, type ApiErrorDetail } from './error';

/** High-level UX classification for API / network / unknown failures. */
export type AppErrorKind =
  | 'validation'
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'network'
  | 'unknown';

/**
 * Transport-agnostic input so web/mobile can map Axios (or other) errors
 * without pulling Axios into `@luxaria/shared-types`.
 */
export type AppErrorInput = {
  status?: number | null;
  body?: Partial<ApiError> | null;
  /** Transport / Error.message (will be sanitized). */
  message?: string | null;
  /** True when no HTTP response was received (offline, DNS, timeout). */
  isNetworkError?: boolean;
};

export type NormalizedAppError = {
  kind: AppErrorKind;
  httpStatus: number | null;
  errorCode: string | null;
  /** User-safe title for alerts / panels. */
  title: string;
  /** User-safe primary message (never stack traces or tokens). */
  message: string;
  details: ApiErrorDetail[];
  /** Map of field → first message (when field is known). */
  fieldErrors: Record<string, string>;
  requestId: string | null;
  timestamp: string | null;
  /** Safe to offer a Retry control (idempotent / transient failures). */
  retryable: boolean;
};

const DEFAULT_FALLBACK = 'Something went wrong';

const TOKEN_PATTERN =
  /\b(?:bearer\s+[\w.+/=-]+|eyJ[\w-]*\.[\w-]+\.[\w-]*)\b/gi;

function looksLikeStackTrace(value: string): boolean {
  return (
    /\n\s*at\s+\S+/.test(value) ||
    /(?:TypeError|ReferenceError|SyntaxError):\s/.test(value) ||
    value.includes('    at ')
  );
}

/** Strip tokens / JWT-like strings and reject stack-trace payloads. */
export function sanitizeErrorMessage(
  value: string | null | undefined,
  fallback = DEFAULT_FALLBACK,
): string {
  if (value == null) {
    return fallback;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  if (looksLikeStackTrace(trimmed)) {
    return fallback;
  }
  const redacted = trimmed.replace(TOKEN_PATTERN, '[redacted]');
  return redacted.length > 500 ? `${redacted.slice(0, 500)}…` : redacted;
}

function isApiErrorBody(value: unknown): value is Partial<ApiError> {
  return typeof value === 'object' && value !== null && 'success' in value;
}

function sanitizeDetails(details: unknown): ApiErrorDetail[] {
  if (!Array.isArray(details)) {
    return [];
  }
  const out: ApiErrorDetail[] = [];
  for (const item of details) {
    if (typeof item === 'string') {
      const message = sanitizeErrorMessage(item, '');
      if (message) out.push({ message });
      continue;
    }
    if (typeof item !== 'object' || item === null) continue;
    const row = item as { field?: unknown; message?: unknown };
    const message = sanitizeErrorMessage(
      typeof row.message === 'string' ? row.message : '',
      '',
    );
    if (!message) continue;
    const field =
      typeof row.field === 'string' && row.field.trim().length > 0
        ? row.field.trim()
        : undefined;
    out.push(field ? { field, message } : { message });
  }
  return out;
}

/**
 * Infer a field key from class-validator style messages when `field` is absent.
 * Example: `email must be an email` → `email`.
 */
export function inferFieldFromDetailMessage(message: string): string | undefined {
  const match = message.match(/^([A-Za-z_][\w.]*)\s+(must|should|is|has|cannot|can)\b/i);
  return match?.[1];
}

export function buildFieldErrors(
  details: ApiErrorDetail[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const detail of details) {
    const field = detail.field?.trim() || inferFieldFromDetailMessage(detail.message);
    if (!field || field in fieldErrors) continue;
    fieldErrors[field] = detail.message;
  }
  return fieldErrors;
}

function kindFromStatusAndCode(
  status: number | null,
  errorCode: string | null,
  isNetworkError: boolean,
): AppErrorKind {
  if (isNetworkError) return 'network';

  if (
    errorCode === ERROR_CODES.VALIDATION_ERROR ||
    status === 422
  ) {
    return 'validation';
  }
  if (errorCode === ERROR_CODES.UNAUTHORIZED || status === 401) {
    return 'unauthorized';
  }
  if (errorCode === ERROR_CODES.FORBIDDEN || status === 403) {
    return 'forbidden';
  }
  if (errorCode === ERROR_CODES.NOT_FOUND || status === 404) {
    return 'not_found';
  }
  if (errorCode === ERROR_CODES.CONFLICT || status === 409) {
    return 'conflict';
  }
  if (
    errorCode === ERROR_CODES.SERVICE_UNAVAILABLE ||
    status === 503 ||
    errorCode === ERROR_CODES.INTERNAL_ERROR ||
    (status != null && status >= 500)
  ) {
    return 'server';
  }
  if (
    errorCode === ERROR_CODES.BAD_REQUEST ||
    status === 400
  ) {
    // Nest ValidationPipe often returns 400 with detail rows.
    return 'bad_request';
  }
  return 'unknown';
}

function titleForKind(kind: AppErrorKind): string {
  switch (kind) {
    case 'validation':
    case 'bad_request':
      return 'Please check your input';
    case 'unauthorized':
      return 'Sign in required';
    case 'forbidden':
      return 'Access denied';
    case 'not_found':
      return 'Not found';
    case 'conflict':
      return 'Conflict';
    case 'server':
      return 'Server error';
    case 'network':
      return 'Connection problem';
    default:
      return 'Something went wrong';
  }
}

function defaultMessageForKind(kind: AppErrorKind, fallback: string): string {
  switch (kind) {
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.';
    case 'forbidden':
      return 'You do not have permission to perform this action.';
    case 'not_found':
      return 'The requested record was not found.';
    case 'conflict':
      return 'This action conflicts with the current state. Refresh and try again.';
    case 'server':
      return 'The server could not complete your request. Please try again.';
    case 'network':
      return 'Unable to reach the server. Check your connection and try again.';
    case 'validation':
    case 'bad_request':
      return 'Some fields need attention. Fix them and try again.';
    default:
      return fallback;
  }
}

function isRetryable(kind: AppErrorKind, status: number | null): boolean {
  if (kind === 'network' || kind === 'server') return true;
  if (status === 408 || status === 429) return true;
  return false;
}

/**
 * Normalise any thrown value / transport payload into a safe UX model.
 * Never returns stack traces or bearer/JWT tokens in `message` / `details`.
 */
export function normalizeAppError(
  input: AppErrorInput | unknown,
  fallback = DEFAULT_FALLBACK,
): NormalizedAppError {
  const structured = coerceInput(input);
  const body = structured.body;
  const status = structured.status ?? null;
  const errorCode =
    typeof body?.errorCode === 'string' && body.errorCode.length > 0
      ? body.errorCode
      : null;
  const details = sanitizeDetails(body?.details);
  const kind = kindFromStatusAndCode(
    status,
    errorCode,
    structured.isNetworkError === true,
  );

  const bodyMessage =
    typeof body?.message === 'string' ? body.message : null;
  const transportMessage = structured.message ?? null;

  let message = sanitizeErrorMessage(bodyMessage, '');
  if (!message) {
    message = sanitizeErrorMessage(transportMessage, '');
  }
  if (!message || message === 'Network Error' || /^Request failed with status code \d+$/i.test(message)) {
    message = defaultMessageForKind(kind, fallback);
  }

  const requestId =
    typeof body?.requestId === 'string' && body.requestId.length > 0
      ? body.requestId
      : null;
  const timestamp =
    typeof body?.timestamp === 'string' && body.timestamp.length > 0
      ? body.timestamp
      : null;

  return {
    kind,
    httpStatus: status,
    errorCode,
    title: titleForKind(kind),
    message,
    details,
    fieldErrors: buildFieldErrors(details),
    requestId,
    timestamp,
    retryable: isRetryable(kind, status),
  };
}

function coerceInput(input: AppErrorInput | unknown): AppErrorInput {
  if (input == null) {
    return {};
  }
  if (typeof input === 'string') {
    return { message: input };
  }
  if (input instanceof Error) {
    return {
      message: input.message,
      isNetworkError: input.name === 'NetworkError',
    };
  }
  if (typeof input !== 'object') {
    return { message: String(input) };
  }

  const obj = input as AppErrorInput & {
    response?: { status?: number; data?: unknown };
    code?: string;
    isAxiosError?: boolean;
  };

  // Axios-shaped without importing axios (check before generic message objects)
  if (
    obj.isAxiosError === true ||
    'response' in obj ||
    obj.code === 'ERR_NETWORK' ||
    obj.code === 'ECONNABORTED'
  ) {
    const response = obj.response;
    const data = response?.data;
    const hasResponse = response != null;
    return {
      status: response?.status ?? null,
      body: isApiErrorBody(data) ? data : null,
      message: typeof obj.message === 'string' ? obj.message : null,
      isNetworkError:
        !hasResponse &&
        (obj.code === 'ERR_NETWORK' ||
          obj.code === 'ECONNABORTED' ||
          obj.message === 'Network Error'),
    };
  }

  if (isApiErrorBody(obj)) {
    return { body: obj, message: obj.message };
  }

  // Explicit AppErrorInput
  if ('status' in obj || 'body' in obj || 'isNetworkError' in obj) {
    return {
      status: obj.status ?? null,
      body: obj.body ?? null,
      message: obj.message ?? null,
      isNetworkError: obj.isNetworkError,
    };
  }

  if (typeof obj.message === 'string') {
    return { message: obj.message };
  }

  return { message: DEFAULT_FALLBACK };
}


export function isUnauthorizedError(error: NormalizedAppError | AppErrorKind): boolean {
  const kind = typeof error === 'string' ? error : error.kind;
  return kind === 'unauthorized';
}

export function isForbiddenErrorKind(error: NormalizedAppError | AppErrorKind): boolean {
  const kind = typeof error === 'string' ? error : error.kind;
  return kind === 'forbidden';
}

export function getUserErrorMessage(
  input: AppErrorInput | unknown,
  fallback = DEFAULT_FALLBACK,
): string {
  return normalizeAppError(input, fallback).message;
}
