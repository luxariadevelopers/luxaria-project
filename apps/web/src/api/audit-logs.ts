import type {
  ApiResponse,
  PaginatedResponse,
  PublicAuditLogEntry,
  AuditAction,
} from '@luxaria/shared-types';
import { apiClient } from './client';

export type ListEntityAuditLogsQuery = {
  entityType: string;
  entityId: string;
  projectId?: string;
  module?: string;
  page?: number;
  limit?: number;
  /** Default ascending for timeline display. */
  sortOrder?: 'asc' | 'desc';
  from?: string;
  to?: string;
};

/** Mirrors Nest `QueryAuditLogDto` (+ pagination). */
export type ListAuditLogsQuery = {
  userId?: string;
  module?: string;
  projectId?: string;
  action?: AuditAction | string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * `GET /audit-logs` filtered to one entity — immutable entity history.
 * Permission: `audit.view`.
 */
export async function listEntityAuditLogs(query: ListEntityAuditLogsQuery) {
  const { data } = await apiClient.get<
    PaginatedResponse<PublicAuditLogEntry> | ApiResponse<PublicAuditLogEntry[]>
  >('/audit-logs', {
    params: {
      entityType: query.entityType,
      entityId: query.entityId,
      projectId: query.projectId,
      module: query.module,
      page: query.page ?? 1,
      limit: query.limit ?? 100,
      sortOrder: query.sortOrder ?? 'asc',
      from: query.from,
      to: query.to,
    },
  });

  return {
    items: data.data ?? [],
    meta: 'meta' in data ? data.meta : undefined,
    message: data.message,
  };
}

/**
 * `GET /audit-logs` — full query for the administration viewer.
 * Permission: `audit.view`. Read-only (no write endpoints exist).
 */
export async function listAuditLogs(query: ListAuditLogsQuery = {}) {
  const { data } = await apiClient.get<
    PaginatedResponse<PublicAuditLogEntry> | ApiResponse<PublicAuditLogEntry[]>
  >('/audit-logs', {
    params: {
      userId: query.userId,
      module: query.module,
      projectId: query.projectId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      from: query.from,
      to: query.to,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy ?? 'timestamp',
      sortOrder: query.sortOrder ?? 'desc',
    },
  });

  return {
    items: data.data ?? [],
    meta: 'meta' in data ? data.meta : undefined,
    message: data.message,
  };
}

/**
 * `GET /audit-logs/:id`
 * Permission: `audit.view`.
 */
export async function getAuditLog(id: string): Promise<PublicAuditLogEntry> {
  const { data } = await apiClient.get<ApiResponse<PublicAuditLogEntry>>(
    `/audit-logs/${id}`,
  );
  if (!data.data) {
    throw new Error(data.message || 'Audit log not found');
  }
  return data.data;
}
