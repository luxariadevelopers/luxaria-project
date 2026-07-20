import {
  ERROR_CODES,
  normalizeAppError,
  type ApiError,
  type NormalizedAppError,
} from '@luxaria/shared-types';
import axios from 'axios';

function isNormalizedAppError(value: unknown): value is NormalizedAppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'retryable' in value &&
    'fieldErrors' in value &&
    'message' in value
  );
}

/** Map Axios / unknown failures into the shared normalised error model. */
export function toAppError(
  error: unknown,
  fallback = 'Something went wrong',
): NormalizedAppError {
  if (isNormalizedAppError(error)) {
    return error;
  }
  return normalizeAppError(error, fallback);
}


export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong',
): string {
  return toAppError(error, fallback).message;
}

export function isForbiddenError(error: unknown): boolean {
  if (axios.isAxiosError<ApiError>(error)) {
    return (
      error.response?.status === 403 ||
      error.response?.data?.errorCode === ERROR_CODES.FORBIDDEN
    );
  }
  return toAppError(error).kind === 'forbidden';
}

export function isUnauthorizedError(error: unknown): boolean {
  if (axios.isAxiosError<ApiError>(error)) {
    return (
      error.response?.status === 401 ||
      error.response?.data?.errorCode === ERROR_CODES.UNAUTHORIZED
    );
  }
  return toAppError(error).kind === 'unauthorized';
}

export function isRetryableError(error: unknown): boolean {
  return toAppError(error).retryable;
}

export function isConflictError(error: unknown): boolean {
  if (axios.isAxiosError<ApiError>(error)) {
    return (
      error.response?.status === 409 ||
      error.response?.data?.errorCode === ERROR_CODES.CONFLICT
    );
  }
  return toAppError(error).kind === 'conflict';
}
