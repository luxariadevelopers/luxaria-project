import { useState } from 'react';
import { Button, Stack, TextField } from '@mui/material';
import type { AllocationLine } from './buildAllocationSchedule';
import { ParticipantApprovalStatus } from '@/project-participants/types';

type Props = {
  lines: readonly AllocationLine[];
  canCreate: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  submitEnabled: boolean;
  busy: boolean;
  onStartRevision: () => void;
  onSubmitDrafts: () => void;
  onApprove: (recordId: string) => void;
  onReject: (recordId: string, reason: string) => void;
};

export function ProfitShareActions({
  lines,
  canCreate,
  canSubmit,
  canApprove,
  submitEnabled,
  busy,
  onStartRevision,
  onSubmitDrafts,
  onApprove,
  onReject,
}: Props) {
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {},
  );

  const needsRevision = lines.some(
    (line) => line.approved && !line.pending,
  );
  const draftCount = lines.filter((line) => line.isEditable).length;
  const submitted = lines.filter(
    (line) =>
      line.pending?.status === ParticipantApprovalStatus.Submitted &&
      line.pending,
  );

  return (
    <Stack spacing={1.5} data-testid="profit-share-actions">
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {canCreate && needsRevision ? (
          <Button
            variant="contained"
            disabled={busy}
            onClick={onStartRevision}
          >
            Start revision
          </Button>
        ) : null}
        {canSubmit && draftCount > 0 ? (
          <Button
            variant="outlined"
            disabled={busy || !submitEnabled}
            onClick={onSubmitDrafts}
          >
            Submit drafts ({draftCount})
          </Button>
        ) : null}
      </Stack>

      {canApprove && submitted.length > 0
        ? submitted.map((line) => {
            const id = line.pending!.id;
            return (
              <Stack
                key={id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'center' } }}
              >
                <TextField
                  size="small"
                  label={`Reject reason — ${line.label}`}
                  value={rejectReasons[id] ?? ''}
                  onChange={(e) =>
                    setRejectReasons((prev) => ({
                      ...prev,
                      [id]: e.target.value,
                    }))
                  }
                  sx={{ flex: 1, minWidth: 220 }}
                />
                <Button
                  variant="contained"
                  color="success"
                  disabled={busy}
                  onClick={() => onApprove(id)}
                >
                  Approve {line.label}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={
                    busy || (rejectReasons[id] ?? '').trim().length < 5
                  }
                  onClick={() =>
                    onReject(id, (rejectReasons[id] ?? '').trim())
                  }
                >
                  Reject
                </Button>
              </Stack>
            );
          })
        : null}
    </Stack>
  );
}
