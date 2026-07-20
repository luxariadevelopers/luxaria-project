import {
  ApprovalHistoryAction,
  AuditAction,
  labelTimelineAction,
} from './actions';
import {
  mergeTimelineEvents,
  normalizeApprovalTimelineEntries,
  normalizeAuditLogEntries,
  normalizeLegacyTimelineEvents,
} from './normalize';

describe('workflow timeline normalize', () => {
  it('labels known approval and audit actions; falls back for legacy', () => {
    expect(labelTimelineAction(ApprovalHistoryAction.Submitted)).toBe(
      'Submitted',
    );
    expect(labelTimelineAction(AuditAction.APPROVE)).toBe('Approved');
    expect(labelTimelineAction('old_custom_event')).toBe('Old custom event');
    expect(labelTimelineAction(null)).toBe('Event');
  });

  it('normalises approval timeline with missing actor and documents', () => {
    const events = normalizeApprovalTimelineEntries(
      [
        {
          id: 'e2',
          stepNumber: 2,
          action: ApprovalHistoryAction.Approved,
          actorId: '507f1f77bcf86cd799439011',
          comment: 'Looks good',
          metadata: {
            documentIds: ['doc-a'],
            fromStatus: 'pending',
            toStatus: 'approved',
          },
          at: '2026-07-20T10:00:00.000Z',
        },
        {
          id: 'e1',
          stepNumber: 1,
          action: ApprovalHistoryAction.Submitted,
          actorId: '',
          comment: null,
          metadata: { amount: 1000 },
          at: '2026-07-20T09:00:00.000Z',
        },
      ],
      {
        actorDirectory: {
          '507f1f77bcf86cd799439011': 'Priya Finance',
        },
      },
    );

    expect(events).toHaveLength(2);
    expect(events[0]?.id).toBe('e1');
    expect(events[0]?.actor.displayName).toBe('Unknown actor');
    expect(events[0]?.statusTransition).toEqual({
      from: null,
      to: 'pending',
    });
    expect(events[1]?.actor.displayName).toBe('Priya Finance');
    expect(events[1]?.documents).toEqual([{ id: 'doc-a', label: null }]);
    expect(events[1]?.statusTransition).toEqual({
      from: 'pending',
      to: 'approved',
    });
  });

  it('normalises audit entity history status transitions', () => {
    const events = normalizeAuditLogEntries([
      {
        id: 'a1',
        userId: null,
        action: AuditAction.UPDATE,
        module: 'purchase-requests',
        entityType: 'purchase_request',
        entityId: 'pr1',
        projectId: 'p1',
        beforeData: { status: 'draft' },
        afterData: {
          status: 'pending_approval',
          comment: 'Submitted to purchase',
          documentIds: ['d1'],
        },
        timestamp: '2026-07-19T12:00:00.000Z',
      },
    ]);

    expect(events[0]?.actor.displayName).toBe('Unknown actor');
    expect(events[0]?.statusTransition).toEqual({
      from: 'draft',
      to: 'pending_approval',
    });
    expect(events[0]?.comment).toBe('Submitted to purchase');
    expect(events[0]?.documents).toEqual([{ id: 'd1', label: null }]);
  });

  it('handles legacy events with unknown actions and missing timestamps', () => {
    const events = normalizeLegacyTimelineEvents([
      {
        action: 'manual_override',
        actorName: 'Legacy Import',
        notes: 'Imported from v1',
        previousStatus: 'open',
        status: 'closed',
        documents: [{ id: 'legacy-doc', fileName: 'scan.pdf' }],
      },
      {
        id: 'x',
        action: '',
        at: 'not-a-date',
      },
    ]);

    expect(events[0]?.kind).toBe('legacy');
    expect(events[0]?.actor.displayName).toBe('Legacy Import');
    expect(events[0]?.statusTransition).toEqual({
      from: 'open',
      to: 'closed',
    });
    expect(events[0]?.documents[0]).toEqual({
      id: 'legacy-doc',
      label: 'scan.pdf',
    });
    expect(events[1]?.at).toBeNull();
    expect(events[1]?.actionLabel).toBe('Event');
  });

  it('merges mixed sources without duplicate ids', () => {
    const approval = normalizeApprovalTimelineEntries([
      {
        id: 'same',
        stepNumber: 1,
        action: ApprovalHistoryAction.Submitted,
        actorId: 'u1',
        comment: null,
        metadata: null,
        at: '2026-07-20T08:00:00.000Z',
      },
    ]);
    const legacy = normalizeLegacyTimelineEvents([
      {
        id: 'same',
        action: 'duplicate',
        at: '2026-07-20T09:00:00.000Z',
      },
      {
        id: 'other',
        action: ApprovalHistoryAction.Cancelled,
        actorId: 'u2',
        at: '2026-07-20T07:00:00.000Z',
      },
    ]);

    const merged = mergeTimelineEvents(approval, legacy);
    expect(merged.map((e) => e.id)).toEqual(['other', 'same']);
    expect(merged[1]?.action).toBe(ApprovalHistoryAction.Submitted);
  });
});
