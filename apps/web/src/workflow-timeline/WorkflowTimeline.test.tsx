import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import {
  ApprovalHistoryAction,
  AuditAction,
  mergeTimelineEvents,
  normalizeApprovalTimelineEntries,
  normalizeAuditLogEntries,
  normalizeLegacyTimelineEvents,
  type WorkflowTimelineEvent,
} from '@luxaria/shared-types';
import { luxariaTheme } from '@/theme/theme';
import { WorkflowTimeline } from './WorkflowTimeline';

function renderTimeline(
  props: Partial<ComponentProps<typeof WorkflowTimeline>> & {
    events?: WorkflowTimelineEvent[];
    canView?: boolean;
  } = {},
) {
  const {
    events = [],
    canView = true,
    ...rest
  } = props;
  return render(
    <MemoryRouter>
      <ThemeProvider theme={luxariaTheme}>
        <WorkflowTimeline events={events} canView={canView} {...rest} />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function mixedEvents(): WorkflowTimelineEvent[] {
  const approval = normalizeApprovalTimelineEntries(
    [
      {
        id: 'appr-1',
        stepNumber: 1,
        action: ApprovalHistoryAction.Submitted,
        actorId: '',
        comment: null,
        metadata: { amount: 250000 },
        at: '2026-07-20T08:00:00.000Z',
      },
      {
        id: 'appr-2',
        stepNumber: 1,
        action: ApprovalHistoryAction.Approved,
        actorId: '507f1f77bcf86cd799439011',
        comment: 'OK to proceed',
        metadata: {
          fromStatus: 'pending',
          toStatus: 'approved',
          documentIds: ['doc-1'],
        },
        at: '2026-07-20T09:30:00.000Z',
      },
    ],
    {
      actorDirectory: {
        '507f1f77bcf86cd799439011': 'Priya Finance',
      },
    },
  );

  const audit = normalizeAuditLogEntries([
    {
      id: 'aud-1',
      userId: null,
      action: AuditAction.UPDATE,
      module: 'purchase-requests',
      entityType: 'purchase_request',
      entityId: 'pr-1',
      projectId: 'proj-1',
      beforeData: { status: 'draft' },
      afterData: {
        status: 'submitted',
        reason: 'Sent for approval',
      },
      timestamp: '2026-07-20T07:00:00.000Z',
    },
  ]);

  const legacy = normalizeLegacyTimelineEvents([
    {
      id: 'leg-1',
      action: 'legacy_note',
      actorName: undefined,
      actorId: null,
      notes: 'Migrated from paper file',
      at: null,
    },
  ]);

  return mergeTimelineEvents(audit, approval, legacy);
}

describe('WorkflowTimeline', () => {
  it('renders mixed event types (snapshot)', () => {
    const { container } = renderTimeline({
      events: mixedEvents(),
      title: 'Audit timeline',
      statusDomainKey: 'purchaseRequest',
    });

    expect(screen.getByTestId('workflow-timeline')).toBeInTheDocument();
    expect(screen.getAllByText('Submitted').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Legacy')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown actor').length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getByText('Priya Finance')).toBeInTheDocument();
    expect(screen.getByText('OK to proceed')).toBeInTheDocument();
    expect(screen.getByText('Migrated from paper file')).toBeInTheDocument();
    expect(screen.getByText('doc-1')).toBeInTheDocument();
    expect(screen.getByText(/Time unknown/)).toBeInTheDocument();

    expect(container.querySelector('[data-testid="workflow-timeline"]'))
      .toMatchSnapshot();
  });

  it('shows loading state', () => {
    renderTimeline({ loading: true, events: [] });
    expect(screen.getByTestId('workflow-timeline-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading timeline/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    renderTimeline({ events: [] });
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });

  it('shows permission denied when canView is false', () => {
    renderTimeline({ canView: false, events: mixedEvents() });
    expect(screen.getByText('History unavailable')).toBeInTheDocument();
    expect(
      screen.getByText(/need view permission/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-timeline')).not.toBeInTheDocument();
  });

  it('shows error + retry for 403', async () => {
    const onRetry = vi.fn();
    renderTimeline({
      events: [],
      error: {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            success: false,
            errorCode: 'FORBIDDEN',
            message: 'Missing approval.view',
            details: [],
            requestId: 'r-forbidden',
            timestamp: 't',
          },
        },
      },
      onRetry,
    });
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.getByText('Missing approval.view')).toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });
});
