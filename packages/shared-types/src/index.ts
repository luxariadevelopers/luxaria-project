/**
 * Shared TypeScript contracts for Luxaria Developers ERP.
 * Common API envelopes (Micro Phase 002). Domain DTOs land in later phases.
 */

export type { AppName, HealthStatus } from './app';
export type {
  ApiError,
  ApiErrorBody,
  ApiErrorDetail,
  ApiResponse,
  ApiResult,
  ApiSuccessResponse,
  AuditMeta,
  ErrorCode,
  PaginatedResponse,
  PaginationMeta,
  PaginationQuery,
  SelectOption,
  SortOrder,
} from './api';
export { ERROR_CODES } from './api';
