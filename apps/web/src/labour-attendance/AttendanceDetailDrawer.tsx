import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate } from '@/format';
import { detectSheetDuplicates } from './detectDuplicates';
import { EvidencePanel } from './EvidencePanel';
import { attendanceStatusLabel } from './labels';
import type { LabourAttendanceCapabilities } from './roleAccess';
import { SkillBreakdown } from './SkillBreakdown';
import { LabourAttendanceStatus } from './types';
import {
  useConfirmLabourAttendance,
  useLabourAttendanceDetail,
} from './useLabourAttendance';

type Props = {
  open: boolean;
  onClose: () => void;
  attendanceId: string | null;
  caps: LabourAttendanceCapabilities;
  contractorLabel: (contractorId: string) => string;
};

export function AttendanceDetailDrawer({
  open,
  onClose,
  attendanceId,
  caps,
  contractorLabel,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const detail = useLabourAttendanceDetail(attendanceId, open && Boolean(attendanceId));
  const confirm = useConfirmLabourAttendance();
  const sheet = detail.data;
  const duplicates = sheet ? detectSheetDuplicates(sheet.lines) : [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack
        spacing={2}
        sx={{ width: { xs: '100vw', sm: 520 }, p: 2.5, maxWidth: '100%' }}
        data-testid="attendance-detail-drawer"
      >
        {detail.isLoading ? (
          <Stack sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : null}

        {detail.error ? (
          <RetryPanel
            error={detail.error}
            title="Could not load attendance"
            message={getErrorMessage(detail.error)}
            onRetry={() => void detail.refetch()}
          />
        ) : null}

        {sheet ? (
          <>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap', alignItems: 'center' }}
            >
              <Typography variant="h6" sx={{ flex: 1 }}>
                {sheet.attendanceNumber}
              </Typography>
              <Chip
                size="small"
                label={attendanceStatusLabel(sheet.status)}
                variant="outlined"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {formatDate(sheet.attendanceDate)} ·{' '}
              {contractorLabel(sheet.contractorId)} · {sheet.totalWorkers}{' '}
              workers · OT {sheet.totalOvertimeHours}h
            </Typography>

            {duplicates.length > 0 ? (
              <Alert
                severity="warning"
                data-testid="attendance-duplicate-flags"
              >
                Duplicate flags:{' '}
                {duplicates.map((flag) => flag.label).join(', ')}
              </Alert>
            ) : (
              <Alert severity="success">No duplicate category/worker flags</Alert>
            )}

            <SkillBreakdown lines={sheet.lines} />
            <Divider />
            <EvidencePanel sheet={sheet} />

            {sheet.remarks ? (
              <Typography variant="body2" color="text.secondary">
                Remarks: {sheet.remarks}
              </Typography>
            ) : null}

            {caps.canConfirm &&
            sheet.status === LabourAttendanceStatus.Submitted ? (
              <Button
                variant="contained"
                disabled={confirm.isPending}
                onClick={() => {
                  void (async () => {
                    try {
                      await confirm.mutateAsync({ id: sheet.id });
                      success('Attendance confirmed');
                    } catch (err) {
                      notifyError(getErrorMessage(err));
                    }
                  })();
                }}
              >
                Confirm attendance
              </Button>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Drawer>
  );
}
