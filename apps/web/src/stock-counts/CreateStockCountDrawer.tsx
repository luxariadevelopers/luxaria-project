import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Button,
  Drawer,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { fetchStockBalance } from '@/stock-balances/api';
import { fetchMaterials } from '@/purchase-requests/api';
import type { PublicMaterial } from '@/purchase-requests/types';
import { AdjustmentPreview } from './AdjustmentPreview';
import { CountGrid } from './CountGrid';
import type { CountGridRow, MaterialUnit } from './types';
import { useCreateStockCount } from './useStockCounts';
import {
  type CountGridFieldErrors,
  validateCountGridRows,
} from './validation';
import { buildAdjustmentPreview } from './variance';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (id: string) => void;
};

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

let rowSeq = 0;
function nextKey(): string {
  rowSeq += 1;
  return `line-${rowSeq}`;
}

export function CreateStockCountDrawer({
  open,
  onClose,
  projectId,
  onCreated,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateStockCount();

  const [countDate, setCountDate] = useState(todayDateOnly);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<CountGridRow[]>([]);
  const [fieldErrors, setFieldErrors] = useState<CountGridFieldErrors>({});
  const [materialOptions, setMaterialOptions] = useState<PublicMaterial[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] =
    useState<PublicMaterial | null>(null);

  const preview = useMemo(
    () =>
      buildAdjustmentPreview(
        rows.map((r) => ({
          materialId: r.materialId,
          materialCode: r.materialCode,
          materialName: r.materialName,
          baseUnit: r.baseUnit,
          systemQuantity: r.systemQuantity,
          physicalQuantity: r.physicalQuantity,
          reason: r.reason,
        })),
      ),
    [rows],
  );

  const requiresDirector = preview.some((l) => l.isLargeVariance);

  const reset = () => {
    setCountDate(todayDateOnly());
    setLocation('');
    setNotes('');
    setRows([]);
    setFieldErrors({});
    setSelectedMaterial(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const searchMaterials = async (input: string) => {
    setMaterialLoading(true);
    try {
      const list = await fetchMaterials({ search: input, limit: 40 });
      setMaterialOptions(list);
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setMaterialLoading(false);
    }
  };

  const addMaterial = async () => {
    if (!selectedMaterial) return;
    if (rows.some((r) => r.materialId === selectedMaterial.id)) {
      notifyError('Material already on this count');
      return;
    }
    try {
      const balance = await fetchStockBalance({
        projectId,
        materialId: selectedMaterial.id,
        location: location.trim() || undefined,
      });
      setRows((prev) => [
        ...prev,
        {
          key: nextKey(),
          materialId: selectedMaterial.id,
          materialCode: selectedMaterial.materialCode,
          materialName: selectedMaterial.name,
          baseUnit: selectedMaterial.baseUnit as MaterialUnit,
          systemQuantity: balance.quantityInBaseUnit,
          physicalQuantity: balance.quantityInBaseUnit,
          reason: '',
          photo: '',
        },
      ]);
      setSelectedMaterial(null);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const handleCreate = async () => {
    const gridCheck = validateCountGridRows(rows);
    if (!gridCheck.ok) {
      setFieldErrors(gridCheck.fieldErrors);
      return;
    }
    setFieldErrors({});
    try {
      const created = await create.mutateAsync({
        projectId,
        countDate,
        location: location.trim() || null,
        notes: notes.trim() || null,
        items: rows.map((r) => ({
          materialId: r.materialId,
          physicalQuantity: r.physicalQuantity,
          reason: r.reason.trim() || null,
          photo: r.photo.trim() || null,
        })),
      });
      success(`Stock count ${created.countNumber} created`);
      handleClose();
      onCreated(created.id);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 560, md: 720 }, p: 2 } },
      }}
    >
      <Stack spacing={2} data-testid="create-stock-count-drawer">
        <Typography variant="h6">New stock count</Typography>
        <Typography variant="body2" color="text.secondary">
          Enter physical quantities. Differences require a reason. Large
          variances (≥10% of system qty) need director approval later.
        </Typography>

        <TextField
          size="small"
          type="date"
          label="Count date"
          value={countDate}
          onChange={(e) => setCountDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          helperText="Optional — matches stock balance location key"
        />
        <TextField
          size="small"
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Autocomplete
            sx={{ flex: 1 }}
            options={materialOptions}
            loading={materialLoading}
            value={selectedMaterial}
            onChange={(_e, value) => setSelectedMaterial(value)}
            onInputChange={(_e, value, reason) => {
              if (reason === 'input') void searchMaterials(value);
            }}
            getOptionLabel={(opt) =>
              `${opt.materialCode} · ${opt.name}`
            }
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Add material" />
            )}
          />
          <Button variant="outlined" onClick={() => void addMaterial()}>
            Add line
          </Button>
        </Stack>

        <CountGrid
          rows={rows}
          fieldErrors={fieldErrors}
          onChange={setRows}
        />

        <AdjustmentPreview
          lines={preview}
          requiresDirectorApproval={requiresDirector}
        />

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            disabled={create.isPending}
            onClick={() => void handleCreate()}
          >
            Create draft
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
