import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { attendanceEntryModeLabel } from './labels';
import type { PublicLabourAttendanceLine } from './types';

type Props = {
  lines: readonly PublicLabourAttendanceLine[];
};

export function SkillBreakdown({ lines }: Props) {
  if (lines.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No skill lines on this sheet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1} data-testid="skill-breakdown">
      <Typography variant="subtitle2">Skill breakdown</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell>Mode</TableCell>
            <TableCell align="right">Workers</TableCell>
            <TableCell align="right">OT hrs</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id || line.labourCategoryId}>
              <TableCell>
                {line.labourCategoryName ||
                  line.labourCategoryCode ||
                  line.labourCategoryId}
              </TableCell>
              <TableCell>{attendanceEntryModeLabel(line.entryMode)}</TableCell>
              <TableCell align="right">{line.workerCount}</TableCell>
              <TableCell align="right">{line.overtimeHours}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
