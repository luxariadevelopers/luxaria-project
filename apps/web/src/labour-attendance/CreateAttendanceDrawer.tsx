import { useEffect, useMemo, useState } from 'react';
import { formDrawerPaperSx } from '@/components/forms';
import {
  Box,
  Button,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { useNotify } from '@/components/NotificationProvider';
import { fetchLabourCategories } from '@/labour-categories/api';
import { LabourCategoryStatus } from '@/labour-categories/types';
import {
  buildAttendanceCreatePayload,
  type AttendanceWorkerDraft,
} from './buildAttendanceCreatePayload';
import { attendanceEntryModeLabel } from './labels';
import { LabourAttendanceEntryMode } from './types';
import { useCreateLabourAttendance } from './useLabourAttendance';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultAttendanceDate?: string;
  onCreated?: (id: string) => void;
};

const emptyWorker = (): AttendanceWorkerDraft => ({
  workerName: '',
  workerCode: '',
  checkIn: '',
  checkOut: '',
  overtimeHours: '0',
  remarks: '',
});

export function CreateAttendanceDrawer({
  open,
  onClose,
  projectId,
  defaultAttendanceDate,
  onCreated,
}: Props) {
  const create = useCreateLabourAttendance();
  const { success, error: notifyError } = useNotify();

  const [contractorId, setContractorId] = useState('');
  const [labourCategoryId, setLabourCategoryId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(
    defaultAttendanceDate ?? new Date().toISOString().slice(0, 10),
  );
  const [entryMode, setEntryMode] = useState<LabourAttendanceEntryMode>(
    LabourAttendanceEntryMode.Group,
  );
  const [workerCount, setWorkerCount] = useState('10');
  const [workers, setWorkers] = useState<AttendanceWorkerDraft[]>([
    emptyWorker(),
  ]);
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [workLocation, setWorkLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const contractors = useQuery({
    queryKey: ['labour-attendance', 'create-contractors', projectId],
    queryFn: () =>
      searchContractors({ search: '', limit: 100, projectId }),
    enabled: open && Boolean(projectId),
    staleTime: 60_000,
    retry: false,
  });

  const categories = useQuery({
    queryKey: ['labour-attendance', 'create-categories'],
    queryFn: () =>
      fetchLabourCategories({
        page: 1,
        limit: 100,
        status: LabourCategoryStatus.Active,
      }),
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    setAttendanceDate(
      defaultAttendanceDate ?? new Date().toISOString().slice(0, 10),
    );
    setEntryMode(LabourAttendanceEntryMode.Group);
    setWorkerCount('10');
    setWorkers([emptyWorker()]);
    setOvertimeHours('0');
    setWorkLocation('');
    setRemarks('');
    setFormError(null);
    setContractorId('');
    setLabourCategoryId('');
  }, [open, defaultAttendanceDate]);

  useEffect(() => {
    if (!open) return;
    if (!contractorId && contractors.data?.[0]) {
      setContractorId(contractors.data[0].id);
    }
  }, [open, contractorId, contractors.data]);

  useEffect(() => {
    if (!open) return;
    if (!labourCategoryId && categories.data?.items[0]) {
      setLabourCategoryId(categories.data.items[0].id);
    }
  }, [open, labourCategoryId, categories.data]);

  const categoryOptions = useMemo(
    () => categories.data?.items ?? [],
    [categories.data],
  );

  const updateWorker = (
    index: number,
    patch: Partial<AttendanceWorkerDraft>,
  ) => {
    setWorkers((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const onSubmit = async () => {
    setFormError(null);
    try {
      const input = buildAttendanceCreatePayload({
        projectId,
        contractorId,
        attendanceDate,
        labourCategoryId,
        entryMode,
        workerCount,
        workers,
        overtimeHours,
        workLocation: workLocation.trim() || null,
        remarks: remarks.trim() || null,
        // Draft: GPS/group photo required only on submit.
        submit: false,
      });
      const created = await create.mutateAsync({
        input,
        idempotencyKey: crypto.randomUUID(),
      });
      success(`Attendance ${created.attendanceNumber} saved as draft`);
      onCreated?.(created.id);
      onClose();
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      notifyError(message);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(520) },
      }}
    >
      <Box
        sx={{ p: 2.5 }}
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
        data-testid="create-attendance-drawer"
      >
        <Stack spacing={2}>
          <Typography variant="h6">New labour attendance</Typography>
          <Typography variant="body2" color="text.secondary">
            Create a draft sheet as group headcount or named individual workers.
            Requires attendance.create. GPS and group photos are required before
            submit.
          </Typography>

          {formError ? (
            <Typography color="error" variant="body2">
              {formError}
            </Typography>
          ) : null}

          <TextField
            size="small"
            type="date"
            label="Attendance date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            required
          />

          <FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
              Entry mode
            </Typography>
            <RadioGroup
              row
              value={entryMode}
              onChange={(e) =>
                setEntryMode(e.target.value as LabourAttendanceEntryMode)
              }
            >
              {Object.values(LabourAttendanceEntryMode).map((mode) => (
                <FormControlLabel
                  key={mode}
                  value={mode}
                  control={<Radio size="small" />}
                  label={attendanceEntryModeLabel(mode)}
                />
              ))}
            </RadioGroup>
          </FormControl>

          <FormControl size="small" required>
            <InputLabel id="create-attendance-contractor">Contractor</InputLabel>
            <Select
              labelId="create-attendance-contractor"
              label="Contractor"
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
            >
              {(contractors.data ?? []).map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.contractorCode} · {row.legalName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" required>
            <InputLabel id="create-attendance-category">
              Labour category
            </InputLabel>
            <Select
              labelId="create-attendance-category"
              label="Labour category"
              value={labourCategoryId}
              onChange={(e) => setLabourCategoryId(e.target.value)}
            >
              {categoryOptions.map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.categoryCode} · {row.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {entryMode === LabourAttendanceEntryMode.Group ? (
            <>
              <TextField
                size="small"
                label="Worker count"
                type="number"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
                required
                slotProps={{ htmlInput: { min: 1 } }}
              />
              <TextField
                size="small"
                label="Overtime hours"
                type="number"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
              />
            </>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Individual workers</Typography>
              {workers.map((worker, index) => (
                <Stack
                  key={`worker-${index}`}
                  spacing={1}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    p: 1.5,
                    borderRadius: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Worker {index + 1}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      disabled={workers.length <= 1}
                      onClick={() =>
                        setWorkers((rows) =>
                          rows.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </Stack>
                  <TextField
                    size="small"
                    label="Worker name"
                    value={worker.workerName}
                    onChange={(e) =>
                      updateWorker(index, { workerName: e.target.value })
                    }
                    required
                  />
                  <TextField
                    size="small"
                    label="Worker code"
                    value={worker.workerCode ?? ''}
                    onChange={(e) =>
                      updateWorker(index, { workerCode: e.target.value })
                    }
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      size="small"
                      label="Check-in"
                      type="datetime-local"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={toLocalDateTimeValue(worker.checkIn)}
                      onChange={(e) =>
                        updateWorker(index, {
                          checkIn: fromLocalDateTimeValue(e.target.value),
                        })
                      }
                      fullWidth
                    />
                    <TextField
                      size="small"
                      label="Check-out"
                      type="datetime-local"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={toLocalDateTimeValue(worker.checkOut)}
                      onChange={(e) =>
                        updateWorker(index, {
                          checkOut: fromLocalDateTimeValue(e.target.value),
                        })
                      }
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    size="small"
                    label="Overtime hours"
                    type="number"
                    value={String(worker.overtimeHours ?? '0')}
                    onChange={(e) =>
                      updateWorker(index, { overtimeHours: e.target.value })
                    }
                    slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                  />
                  <TextField
                    size="small"
                    label="Remarks"
                    value={worker.remarks ?? ''}
                    onChange={(e) =>
                      updateWorker(index, { remarks: e.target.value })
                    }
                  />
                </Stack>
              ))}
              <Button
                variant="outlined"
                onClick={() => setWorkers((rows) => [...rows, emptyWorker()])}
              >
                Add worker
              </Button>
              <TextField
                size="small"
                label="Line overtime hours (optional)"
                type="number"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                helperText="Leave 0 to sum worker overtime on the server"
              />
            </Stack>
          )}

          <TextField
            size="small"
            label="Work location"
            value={workLocation}
            onChange={(e) => setWorkLocation(e.target.value)}
          />
          <TextField
            size="small"
            label="Remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            multiline
            minRows={2}
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              {create.isPending ? 'Saving…' : 'Save draft'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}

function toLocalDateTimeValue(iso: string | undefined): string {
  if (!iso?.trim()) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalDateTimeValue(value: string): string {
  if (!value.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}
