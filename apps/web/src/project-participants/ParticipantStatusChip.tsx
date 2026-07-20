import { Chip } from '@mui/material';
import { participantStatusLabel } from './labels';
import {
  ParticipantApprovalStatus,
  type ParticipantApprovalStatus as Status,
} from './types';

type Props = {
  status: Status;
};

export function ParticipantStatusChip({ status }: Props) {
  const color =
    status === ParticipantApprovalStatus.Approved
      ? 'success'
      : status === ParticipantApprovalStatus.Submitted
        ? 'info'
        : status === ParticipantApprovalStatus.Rejected
          ? 'error'
          : 'default';

  return (
    <Chip
      size="small"
      label={participantStatusLabel(status)}
      color={color}
      variant={status === ParticipantApprovalStatus.Draft ? 'outlined' : 'filled'}
      data-testid="participant-status-chip"
    />
  );
}
