import type { AdminPaginationMeta } from './types';

export function readAdminPaginationMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): AdminPaginationMeta {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}
