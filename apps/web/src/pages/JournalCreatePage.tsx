import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { flattenAccountTree } from '@/chart-of-accounts/hierarchy';
import { useAccountTree } from '@/chart-of-accounts/useChartOfAccounts';
import {
  applyApiFieldErrors,
  DateInput,
  FormSection,
  FormTextField,
} from '@/components/forms';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import { isJournalBalanced } from '@/journals/balance';
import { JournalLinesGrid } from '@/journals/JournalLinesGrid';
import { resolveJournalCapabilities } from '@/journals/roleAccess';
import {
  useCreateJournal,
  useSubmitJournal,
} from '@/journals/useJournals';
import { validateJournalEntryDraft } from '@/journals/validateEntry';
import {
  defaultJournalCreateValues,
  journalCreateSchema,
  shapeJournalCreatePayload,
  type JournalCreateFormValues,
} from '@/journals/validation';

/**
 * Manual journal entry — `/accounting/journals/new` (Micro Phase 044).
 *
 * Nest: `POST /journals` + `POST /journals/:id/submit` — both `journal.create`
 * (catalog has no `journal.submit`).
 */
export function JournalCreatePage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const { projects } = useProject();
  const { success, error: notifyError } = useNotify();
  const caps = resolveJournalCapabilities(hasPermission);
  const canPickAccounts = hasPermission('account.view');

  const create = useCreateJournal();
  const submit = useSubmitJournal();

  const treeQuery = useAccountTree(
    undefined,
    Boolean(access) && caps.canCreate && canPickAccounts,
  );

  const accounts = useMemo(
    () => flattenAccountTree(treeQuery.data ?? []),
    [treeQuery.data],
  );
  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const { control, handleSubmit, setValue, setError } =
    useForm<JournalCreateFormValues>({
      resolver: zodResolver(journalCreateSchema),
      defaultValues: defaultJournalCreateValues(),
      mode: 'onBlur',
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchedLines = useWatch({ control, name: 'lines' });
  const headerProjectId = useWatch({ control, name: 'projectId' });

  const draftCheck = useMemo(() => {
    const lines = watchedLines ?? [];
    return validateJournalEntryDraft({
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit ?? 0),
        credit: Number(l.credit ?? 0),
        projectId: l.projectId,
        partyType: l.partyType,
        partyId: l.partyId,
        description: l.description,
      })),
      headerProjectId,
      accountById,
    });
  }, [watchedLines, headerProjectId, accountById]);

  if (access && !caps.canCreate) {
    return (
      <PermissionDenied
        title="Cannot create journal"
        message="You need journal.create to create or submit journals. (There is no journal.submit code in the Nest catalog.)"
      />
    );
  }

  if (access && caps.canCreate && !canPickAccounts) {
    return (
      <PermissionDenied
        title="Account picker unavailable"
        message="Selecting journal accounts requires account.view in addition to journal.create."
        showHomeLink={false}
      />
    );
  }

  if (treeQuery.error) {
    if (isForbiddenError(treeQuery.error)) {
      return (
        <PermissionDenied
          title="Accounts denied"
          message="The server denied access to the chart of accounts (403)."
        />
      );
    }
    return (
      <RetryPanel
        error={treeQuery.error}
        onRetry={() => void treeQuery.refetch()}
        forceRetry
      />
    );
  }

  if (treeQuery.isLoading) {
    return <Typography color="text.secondary">Loading accounts…</Typography>;
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="No posting accounts"
        description="Seed or create accounts with allowManualPosting before entering a journal."
      />
    );
  }

  const busy = create.isPending || submit.isPending;

  const persist = async (
    values: JournalCreateFormValues,
    thenSubmit: boolean,
  ) => {
    const check = validateJournalEntryDraft({
      lines: values.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        projectId: l.projectId,
        partyType: l.partyType,
        partyId: l.partyId,
      })),
      headerProjectId: values.projectId,
      accountById,
    });
    if (!check.ok) {
      notifyError(check.issues[0]?.message ?? 'Journal is not valid');
      return;
    }

    try {
      const created = await create.mutateAsync(
        shapeJournalCreatePayload(values),
      );
      if (thenSubmit) {
        await submit.mutateAsync(created.id);
        success(`Journal ${created.journalNumber} submitted for approval`);
      } else {
        success(`Draft ${created.journalNumber} saved`);
      }
      navigate('/accounting/journals');
    } catch (err) {
      applyApiFieldErrors(setError, err);
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="journal-create-page"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit((values) => persist(values, false))();
      }}
    >
      <Typography color="text.secondary">
        Create a balanced manual journal draft. Submit sends it for approval
        (draft → pending_approval). Posting is a later step (`journal.post`).
      </Typography>

      <Alert severity="info" variant="outlined">
        Debit must equal credit; a line cannot have both debit and credit.
        Project/party dimensions are required when the account flags them.
      </Alert>

      <FormSection title="Header">
        <DateInput
          name="journalDate"
          control={control}
          label="Journal date"
          required
        />
        <FormTextField
          name="narration"
          control={control}
          label="Narration"
          required
          multiline
          minRows={2}
        />
        <Controller
          name="projectId"
          control={control}
          render={({ field }) => (
            <FormControl size="small" fullWidth disabled={busy}>
              <InputLabel id="jv-header-project">Header project</InputLabel>
              <Select
                {...field}
                labelId="jv-header-project"
                label="Header project"
                value={field.value ?? ''}
              >
                <MenuItem value="">
                  <em>None (set per line if required)</em>
                </MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.projectCode} — {p.projectName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </FormSection>

      <JournalLinesGrid
        control={control}
        fields={fields}
        append={append}
        remove={remove}
        setValue={setValue}
        accounts={accounts}
        projects={projects}
        headerProjectId={headerProjectId ?? null}
        disabled={busy}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Debit: <strong>{formatInr(draftCheck.totalDebit)}</strong>
            {' · '}
            Credit: <strong>{formatInr(draftCheck.totalCredit)}</strong>
            {' · '}
            {isJournalBalanced(draftCheck.totalDebit, draftCheck.totalCredit)
              ? 'Balanced'
              : 'Out of balance'}
          </Typography>
          {draftCheck.issues.length > 0 ? (
            <Typography variant="caption" color="error">
              {draftCheck.issues[0]?.message}
            </Typography>
          ) : (
            <Typography variant="caption" color="success.main">
              Ready to save
            </Typography>
          )}
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button
            type="button"
            onClick={() => navigate('/accounting/journals')}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outlined"
            disabled={busy || !draftCheck.ok}
          >
            {create.isPending && !submit.isPending
              ? 'Saving…'
              : 'Save draft'}
          </Button>
          <Button
            type="button"
            variant="contained"
            disabled={busy || !draftCheck.ok}
            onClick={() =>
              void handleSubmit((values) => persist(values, true))()
            }
          >
            {submit.isPending ? 'Submitting…' : 'Save & submit'}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
