import { useMemo, useState } from 'react';
import {
  Alert,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ApprovalHistoryAction,
  AuditAction,
  mergeTimelineEvents,
  normalizeApprovalTimelineEntries,
  normalizeAuditLogEntries,
  normalizeLegacyTimelineEvents,
} from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import { useProject } from '@/context/ProjectContext';
import {
  WorkflowTimeline,
  useApprovalTimeline,
  useEntityAuditTimeline,
} from '@/workflow-timeline';

/**
 * Dev-only workflow timeline demo (Micro Phase 016). Not in the sidebar.
 */
export function WorkflowTimelineDemoPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const [approvalId, setApprovalId] = useState('');
  const [entityType, setEntityType] = useState('purchase_request');
  const [entityId, setEntityId] = useState('');

  const canViewApproval = hasPermission('approval.view');
  const canViewAudit = hasPermission('audit.view');

  const fixtureEvents = useMemo(
    () =>
      mergeTimelineEvents(
        normalizeAuditLogEntries([
          {
            id: 'demo-aud',
            userId: null,
            action: AuditAction.UPDATE,
            module: 'purchase-requests',
            entityType: 'purchase_request',
            entityId: 'demo',
            projectId: selectedProjectId,
            beforeData: { status: 'draft' },
            afterData: {
              status: 'submitted',
              reason: 'Fixture: sent for approval',
            },
            timestamp: '2026-07-20T07:00:00.000Z',
          },
        ]),
        normalizeApprovalTimelineEntries(
          [
            {
              id: 'demo-sub',
              stepNumber: 1,
              action: ApprovalHistoryAction.Submitted,
              actorId: '',
              comment: null,
              metadata: { amount: 100000 },
              at: '2026-07-20T08:00:00.000Z',
            },
            {
              id: 'demo-ok',
              stepNumber: 1,
              action: ApprovalHistoryAction.Approved,
              actorId: 'u-demo',
              comment: 'Fixture approval comment',
              metadata: {
                fromStatus: 'pending',
                toStatus: 'approved',
                documentIds: ['doc-demo'],
              },
              at: '2026-07-20T09:00:00.000Z',
            },
          ],
          { actorDirectory: { 'u-demo': 'Demo Approver' } },
        ),
        normalizeLegacyTimelineEvents([
          {
            id: 'demo-legacy',
            action: 'paper_file_note',
            notes: 'Fixture legacy event without actor/time',
          },
        ]),
      ),
    [selectedProjectId],
  );

  const approvalQuery = useApprovalTimeline({
    projectId: selectedProjectId,
    approvalId: approvalId.length === 24 ? approvalId : null,
    enabled: canViewApproval && approvalId.length === 24,
  });

  const auditQuery = useEntityAuditTimeline({
    entityType,
    entityId: entityId.length === 24 ? entityId : null,
    projectId: selectedProjectId,
    enabled: canViewAudit && entityId.length === 24,
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Workflow timeline demo</Typography>
      <Typography color="text.secondary">
        Reusable audit timeline for approval + entity history. Open{' '}
        <code>/dev/workflow-timeline</code> (no menu item).
      </Typography>

      <Alert severity="info" variant="outlined">
        Fixture below mixes approval, audit, and legacy events (missing actor).
        Live fetches require <code>approval.view</code> / <code>audit.view</code>{' '}
        and a selected project where applicable.
      </Alert>

      <WorkflowTimeline
        title="Fixture (mixed event types)"
        events={fixtureEvents}
        canView
        statusDomainKey="purchaseRequest"
      />

      <Stack spacing={1.5}>
        <Typography variant="h6">Live approval timeline</Typography>
        <TextField
          label="Approval request id"
          value={approvalId}
          onChange={(e) => setApprovalId(e.target.value.trim())}
          helperText={`Project: ${selectedProjectId ?? 'none selected'} · permission approval.view`}
          sx={{ maxWidth: 420 }}
        />
        <WorkflowTimeline
          title="Approval timeline"
          events={approvalQuery.events}
          canView={canViewApproval}
          loading={approvalQuery.isFetching}
          error={approvalQuery.error}
          onRetry={() => void approvalQuery.refetch()}
        />
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="h6">Live entity audit history</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Entity type"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value.trim())}
            sx={{ maxWidth: 240 }}
          />
          <TextField
            label="Entity id"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value.trim())}
            helperText="permission audit.view"
            sx={{ maxWidth: 420 }}
          />
        </Stack>
        <WorkflowTimeline
          title="Entity history"
          events={auditQuery.events}
          canView={canViewAudit}
          loading={auditQuery.isFetching}
          error={auditQuery.error}
          onRetry={() => void auditQuery.refetch()}
          statusDomainKey="purchaseRequest"
        />
      </Stack>
    </Stack>
  );
}
