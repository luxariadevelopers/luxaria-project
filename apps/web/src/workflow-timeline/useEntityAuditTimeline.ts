import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  normalizeAuditLogEntries,
  type NormalizeTimelineOptions,
} from '@luxaria/shared-types';
import { listEntityAuditLogs } from '@/api/audit-logs';

export type UseEntityAuditTimelineArgs = {
  entityType: string | null | undefined;
  entityId: string | null | undefined;
  projectId?: string | null;
  module?: string;
  /**
   * Caller must pass entity view permission (and typically `audit.view`).
   * Do not fetch when the user cannot see the parent record.
   */
  enabled?: boolean;
  actorDirectory?: NormalizeTimelineOptions['actorDirectory'];
  limit?: number;
};

/**
 * Loads entity history via `GET /audit-logs?entityType=&entityId=`.
 */
export function useEntityAuditTimeline({
  entityType,
  entityId,
  projectId,
  module,
  enabled = true,
  actorDirectory,
  limit = 100,
}: UseEntityAuditTimelineArgs) {
  const canFetch = Boolean(enabled && entityType && entityId);

  const query = useQuery({
    queryKey: [
      'audit-logs',
      'entity-timeline',
      entityType,
      entityId,
      projectId,
      module,
      limit,
    ],
    queryFn: () =>
      listEntityAuditLogs({
        entityType: entityType!,
        entityId: entityId!,
        projectId: projectId ?? undefined,
        module,
        limit,
        sortOrder: 'asc',
      }),
    enabled: canFetch,
    retry: false,
  });

  const events = useMemo(
    () =>
      normalizeAuditLogEntries(query.data?.items ?? [], {
        actorDirectory,
      }),
    [query.data?.items, actorDirectory],
  );

  return {
    ...query,
    events,
  };
}
