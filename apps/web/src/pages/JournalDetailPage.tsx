import { useMemo, useState } from 'react';
import { Alert, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EntityActionBar,
  EntityDetailLayout,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import { buildJournalTimeline } from '@/journals/buildJournalTimeline';
import { CancelJournalDialog } from '@/journals/CancelJournalDialog';
import { resolveJournalDetailActions } from '@/journals/immutableState';
import { JournalHeader } from '@/journals/JournalHeader';
import { JournalLinesTable } from '@/journals/JournalLinesTable';
import {
  isLockedPeriodError,
  lockedPeriodUserMessage,
} from '@/journals/lockedPeriodError';
import { ReverseJournalDialog } from '@/journals/ReverseJournalDialog';
import { resolveJournalCapabilities } from '@/journals/roleAccess';
import {
  useJournalDetail,
  usePostJournal,
  useSubmitJournal,
} from '@/journals/useJournals';
import { WorkflowTimeline } from '@/workflow-timeline';

/**
 * Journal detail — `/accounting/journals/:journalId` (Micro Phase 045).
 *
 * Nest: GET detail · POST submit/post/reverse/cancel
 * Permissions: journal.view / create (cancel+submit) / post / reverse
 * Posted entries are immutable; corrections via reverse only.
 */
export function JournalDetailPage() {
  const { journalId = '' } = useParams<{ journalId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveJournalCapabilities(hasPermission);
  const { projects } = useProject();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotify();

  const [reverseOpen, setReverseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useJournalDetail(journalId || null, canView);
  const journal = detailQuery.data;

  const submit = useSubmitJournal();
  const post = usePostJournal();

  const allowed = journal
    ? resolveJournalDetailActions(journal, caps)
    : [];

  const projectLabel = useMemo(() => {
    if (!journal?.projectId) return 'Company';
    const p = projects.find((x) => x.id === journal.projectId);
    if (!p) return journal.projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [journal, projects]);

  const summaryFields = useMemo(() => {
    if (!journal) return [];
    return [
      {
        id: 'date',
        label: 'Journal date',
        value: formatDate(journal.journalDate),
      },
      {
        id: 'debit',
        label: 'Total debit',
        value: formatInr(journal.totalDebit),
      },
      {
        id: 'credit',
        label: 'Total credit',
        value: formatInr(journal.totalCredit),
      },
      {
        id: 'project',
        label: 'Project',
        value: projectLabel,
      },
      {
        id: 'postedAt',
        label: 'Posted at',
        value: journal.postedAt ? formatDate(journal.postedAt) : '—',
      },
      {
        id: 'fy',
        label: 'Financial year id',
        value: journal.financialYearId,
      },
    ];
  }, [journal, projectLabel]);

  const actions: EntityDetailAction[] = journal
    ? [
        {
          id: 'submit',
          label: 'Submit',
          permission: 'journal.create',
          allowedStatuses: ['draft'],
          onClick: () => {
            void (async () => {
              try {
                await submit.mutateAsync(journal.id);
                success('Journal submitted for approval');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: submit.isPending,
          disabled: !allowed.includes('submit'),
        },
        {
          id: 'post',
          label: 'Post',
          permission: 'journal.post',
          allowedStatuses: ['draft', 'pending_approval'],
          color: 'success',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await post.mutateAsync(journal.id);
                success('Journal posted — entry is now immutable');
              } catch (err) {
                if (isLockedPeriodError(err)) {
                  notifyError(lockedPeriodUserMessage(err));
                } else {
                  notifyError(getErrorMessage(err));
                }
              }
            })();
          },
          loading: post.isPending,
          disabled: !allowed.includes('post'),
        },
        {
          id: 'reverse',
          label: 'Reverse',
          permission: 'journal.reverse',
          allowedStatuses: ['posted'],
          color: 'warning',
          onClick: () => setReverseOpen(true),
          disabled: !allowed.includes('reverse'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'journal.create',
          allowedStatuses: ['draft', 'pending_approval'],
          color: 'error',
          variant: 'outlined',
          onClick: () => setCancelOpen(true),
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () => (journal ? buildJournalTimeline(journal) : []),
    [journal],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Journal unavailable"
        message="You need the journal.view permission to open this journal."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Journal denied"
        message="The server denied access to this journal (403)."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !journal
        }
        permissionTitle="Journal unavailable"
        permissionMessage="You need the journal.view permission to open this journal."
        notFoundTitle="Journal not found"
        notFoundDescription="This journal id is invalid or the entry was removed."
        header={journal ? <JournalHeader journal={journal} /> : undefined}
        actionBar={
          journal ? (
            <EntityActionBar
              actions={actions}
              status={journal.status}
              hasPermission={hasPermission}
              emptyHint="No post / reverse / cancel actions for this status and your permissions. Posted journals are immutable."
            />
          ) : undefined
        }
        summary={
          journal ? <SummaryCards fields={summaryFields} /> : undefined
        }
        timeline={
          journal ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              title="Lifecycle timeline"
            />
          ) : undefined
        }
      >
        {journal ? (
          <Stack spacing={2} data-testid="journal-detail-body">
            {journal.reversedBy ? (
              <Alert severity="info" variant="outlined">
                Reversed by{' '}
                <Link
                  component={RouterLink}
                  to={`/accounting/journals/${journal.reversedBy}`}
                  underline="hover"
                >
                  reversing entry
                </Link>
                .
              </Alert>
            ) : null}
            {journal.reversalOf ? (
              <Alert severity="info" variant="outlined">
                This is a reversing entry for{' '}
                <Link
                  component={RouterLink}
                  to={`/accounting/journals/${journal.reversalOf}`}
                  underline="hover"
                >
                  original journal
                </Link>
                .
              </Alert>
            ) : null}
            <Typography variant="subtitle1">Lines</Typography>
            <JournalLinesTable journal={journal} />
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <ReverseJournalDialog
        open={reverseOpen}
        onClose={() => setReverseOpen(false)}
        journal={journal ?? null}
        onReversed={(reversalId) => {
          void navigate(`/accounting/journals/${reversalId}`);
        }}
      />
      <CancelJournalDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        journal={journal ?? null}
        onCancelled={() => {
          void detailQuery.refetch();
        }}
      />
    </>
  );
}
