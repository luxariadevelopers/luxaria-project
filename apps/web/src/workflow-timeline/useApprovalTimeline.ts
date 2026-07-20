import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  normalizeApprovalTimelineEntries,
  type NormalizeTimelineOptions,
} from '@luxaria/shared-types';
import { getApprovalTimeline } from '@/api/approvals';

export type UseApprovalTimelineArgs = {
  projectId: string | null | undefined;
  approvalId: string | null | undefined;
  /**
   * Gate fetch: require entity/approval view permission (and usually
   * `approval.view`) before calling the API. Backend still enforces 403.
   */
  enabled?: boolean;
  actorDirectory?: NormalizeTimelineOptions['actorDirectory'];
};

/**
 * Loads `GET /projects/:projectId/approvals/:id/timeline` and normalises events.
 */
export function useApprovalTimeline({
  projectId,
  approvalId,
  enabled = true,
  actorDirectory,
}: UseApprovalTimelineArgs) {
  const canFetch = Boolean(enabled && projectId && approvalId);

  const query = useQuery({
    queryKey: ['approvals', 'timeline', projectId, approvalId],
    queryFn: () => getApprovalTimeline(projectId!, approvalId!),
    enabled: canFetch,
    retry: false,
  });

  const events = useMemo(
    () =>
      normalizeApprovalTimelineEntries(query.data?.timeline ?? [], {
        actorDirectory,
      }),
    [query.data?.timeline, actorDirectory],
  );

  return {
    ...query,
    events,
    approval: query.data?.approval ?? null,
  };
}
