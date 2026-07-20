import { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { formatProfitSharePercent } from '@/project-participants/labels';
import { ParticipantStatusChip } from '@/project-participants/ParticipantStatusChip';
import { ParticipantApprovalStatus } from '@/project-participants/types';
import type { AllocationLine } from './buildAllocationSchedule';
import { isValidPercentInput } from './allocationValidation';

type DraftEdit = {
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
};

type Props = {
  lines: readonly AllocationLine[];
  canUpdate: boolean;
  busyRecordId: string | null;
  /** Local edits applied for total / comparison (keyed by draft record id). */
  localEdits: Record<string, DraftEdit>;
  onLocalEdit: (recordId: string, edit: DraftEdit) => void;
  onCommitDraft: (recordId: string, edit: DraftEdit) => void;
};

/**
 * Editable allocation grid — only draft rows accept input.
 * Approved lines are shown read-only (immutable).
 */
export function AllocationGrid({
  lines,
  canUpdate,
  busyRecordId,
  localEdits,
  onLocalEdit,
  onCommitDraft,
}: Props) {
  const [draftInputs, setDraftInputs] = useState<Record<string, DraftEdit>>(
    {},
  );

  useEffect(() => {
    const next: Record<string, DraftEdit> = {};
    for (const line of lines) {
      if (!line.pending || !line.isEditable) continue;
      const id = line.pending.id;
      next[id] = localEdits[id] ?? {
        approvedProfitSharePercentage: line.proposedProfitShare,
        lossSharePercentage: line.proposedLossShare,
      };
    }
    setDraftInputs(next);
  }, [lines, localEdits]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="allocation-grid">
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
        Allocation grid
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Edit draft profit / loss shares only. Approved percentages cannot be
        overwritten — start a revision to create new versions.
      </Typography>

      {lines.length === 0 ? (
        <Typography color="text.secondary">
          No participants on this project yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Participant</TableCell>
              <TableCell align="right">Approved profit %</TableCell>
              <TableCell align="right">Proposed profit %</TableCell>
              <TableCell align="right">Proposed loss %</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => {
              const draftId = line.pending?.id;
              const editable = Boolean(
                canUpdate && line.isEditable && draftId,
              );
              const busy = draftId != null && busyRecordId === draftId;
              const input =
                draftId != null
                  ? (draftInputs[draftId] ?? {
                      approvedProfitSharePercentage: line.proposedProfitShare,
                      lossSharePercentage: line.proposedLossShare,
                    })
                  : null;

              return (
                <TableRow key={line.participantKey}>
                  <TableCell>{line.label}</TableCell>
                  <TableCell align="right">
                    {formatProfitSharePercent(line.approvedProfitShare)}
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 120 }}>
                    {editable && input && draftId ? (
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{
                          htmlInput: { min: 0, max: 100, step: 0.01 },
                        }}
                        value={input.approvedProfitSharePercentage}
                        disabled={busy}
                        error={input.approvedProfitSharePercentage < 0}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          if (!Number.isFinite(next)) return;
                          const edit = {
                            ...input,
                            approvedProfitSharePercentage: next,
                          };
                          setDraftInputs((prev) => ({
                            ...prev,
                            [draftId]: edit,
                          }));
                          onLocalEdit(draftId, edit);
                        }}
                        onBlur={() => {
                          if (!isValidPercentInput(input.approvedProfitSharePercentage)) {
                            return;
                          }
                          onCommitDraft(draftId, input);
                        }}
                      />
                    ) : (
                      formatProfitSharePercent(line.proposedProfitShare)
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ minWidth: 120 }}>
                    {editable && input && draftId ? (
                      <TextField
                        size="small"
                        type="number"
                        slotProps={{
                          htmlInput: { min: 0, max: 100, step: 0.01 },
                        }}
                        value={input.lossSharePercentage}
                        disabled={busy}
                        error={input.lossSharePercentage < 0}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          if (!Number.isFinite(next)) return;
                          const edit = {
                            ...input,
                            lossSharePercentage: next,
                          };
                          setDraftInputs((prev) => ({
                            ...prev,
                            [draftId]: edit,
                          }));
                          onLocalEdit(draftId, edit);
                        }}
                        onBlur={() => {
                          if (!isValidPercentInput(input.lossSharePercentage)) {
                            return;
                          }
                          onCommitDraft(draftId, input);
                        }}
                      />
                    ) : (
                      formatProfitSharePercent(line.proposedLossShare)
                    )}
                  </TableCell>
                  <TableCell>
                    {line.pendingStatus ? (
                      <ParticipantStatusChip status={line.pendingStatus} />
                    ) : line.approved ? (
                      <ParticipantStatusChip
                        status={ParticipantApprovalStatus.Approved}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
