import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DigestAdminPanel } from '@/director-digest/DigestAdminPanel';
import { DigestPreviewPanel } from '@/director-digest/DigestPreviewPanel';
import { resolveDirectorDigestCapabilities } from '@/director-digest/roleAccess';
import type { SendDigestResult } from '@/director-digest/types';
import {
  useRunDirectorDigestJob,
  useSendDirectorDigest,
} from '@/director-digest/useDirectorDigest';

/**
 * Daily director digest — `/administration/director-digest`.
 *
 * Nest: `/director-digest/preview` · `/preview-all` · `/send` · `/run`
 * Permissions: `director_digest.view` · `director_digest.send`
 */
export function DirectorDigestPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveDirectorDigestCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [date, setDate] = useState('');
  const [force, setForce] = useState(false);
  const [lastSendResult, setLastSendResult] = useState<SendDigestResult | null>(
    null,
  );

  const send = useSendDirectorDigest();
  const runJob = useRunDirectorDigestJob();

  const canAccess = Boolean(access) && (caps.canView || caps.canSend);

  const handleSend = async () => {
    try {
      const result = await send.mutateAsync({
        date: date || undefined,
        force,
      });
      setLastSendResult(result);
      success(`Digests sent: ${result.sentCount}, failed: ${result.failedCount}`);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const handleRunJob = async () => {
    try {
      const result = await runJob.mutateAsync({
        date: date || undefined,
        force,
      });
      if (result.mode === 'queued') {
        success(`Digest job queued (${result.jobId})`);
      } else {
        setLastSendResult(result.result);
        success(
          `Inline digest run: sent ${result.result.sentCount}, failed ${result.result.failedCount}`,
        );
      }
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  if (access && !canAccess) {
    return (
      <PermissionDenied
        title="Director digest unavailable"
        message="You need director_digest.view or director_digest.send to access this page."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="director-digest-page">
      <Typography color="text.secondary">
        Preview and send the daily director digest. Covers project expenses,
        funds, payments, attendance, materials, and pending approvals for
        director-scoped projects. Global scope — no project header required.
      </Typography>

      {caps.canView ? (
        <DigestPreviewPanel caps={caps} date={date} onDateChange={setDate} />
      ) : null}

      {caps.canSend ? (
        <DigestAdminPanel
          date={date}
          force={force}
          onDateChange={setDate}
          onForceChange={setForce}
          onSend={() => void handleSend()}
          onRunJob={() => void handleRunJob()}
          sending={send.isPending}
          running={runJob.isPending}
          lastResult={lastSendResult}
          error={send.error ?? runJob.error}
        />
      ) : null}
    </Stack>
  );
}
