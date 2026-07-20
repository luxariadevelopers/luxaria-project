/**
 * Mirrors `apps/backend/src/common/dto/pagination-query.dto.ts`
 * (`PaginationQueryDto` + `buildPaginationMeta`).
 */

export type SortOrder = 'asc' | 'desc';

/** Client/query params accepted by list endpoints using PaginationQueryDto. */
export type PaginationQuery = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
};

/** Pagination block placed in `ApiResponse.meta` by list handlers. */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
