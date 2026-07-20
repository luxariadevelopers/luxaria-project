import type { ApiError } from './error';
import type { PaginationMeta } from './pagination';

/**
 * Mirrors `apps/backend/src/common/dto/api-response.dto.ts`
 * (`ApiResponseDto` / `createSuccessResponse`).
 */
export type ApiResponse<T = unknown> = {
  success: true;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
};

/** @deprecated Prefer `ApiResponse` — retained for existing client imports. */
export type ApiSuccessResponse<T = unknown> = ApiResponse<T>;

/**
 * List success envelope where `meta` is the pagination block from
 * `buildPaginationMeta`. Extra meta keys remain allowed via intersection.
 */
export type PaginatedResponse<T> = {
  success: true;
  message: string;
  data?: T[];
  meta: PaginationMeta & Record<string, unknown>;
};

/** Discriminated union of success / error envelopes. */
export type ApiResult<T> = ApiResponse<T> | ApiError;
