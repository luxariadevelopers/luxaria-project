import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatQuantity } from '@/format';
import { fetchMaterials } from '@/purchase-requests/api';
import type { PublicMaterial } from '@/purchase-requests/types';
import {
  STOCK_RESERVATION_SOURCE_OPTIONS,
  materialUnitLabel,
  stockReservationSourceLabel,
} from './labels';
import type { MaterialUnit, StockReservationSourceType } from './types';
import { StockReservationSourceType as SourceType } from './types';
import {
  useAvailableStock,
  useCreateStockReservation,
} from './useStockReservations';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (id: string) => void;
};

export function CreateStockReservationDrawer({
  open,
  onClose,
  projectId,
  onCreated,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateStockReservation();

  const [materialOptions, setMaterialOptions] = useState<PublicMaterial[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] =
    useState<PublicMaterial | null>(null);
  const [unit, setUnit] = useState<MaterialUnit | ''>('');
  const [quantity, setQuantity] = useState('');
  const [location, setLocation] = useState('');
  const [sourceType, setSourceType] = useState<StockReservationSourceType>(
    SourceType.Manual,
  );
  const [sourceId, setSourceId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  const unitOptions = useMemo(() => {
    if (!selectedMaterial) return [] as MaterialUnit[];
    const units = new Set<MaterialUnit>([
      selectedMaterial.baseUnit as MaterialUnit,
      ...((selectedMaterial.alternateUnits ?? []) as MaterialUnit[]),
    ]);
    return [...units];
  }, [selectedMaterial]);

  const availableQuery = useAvailableStock(
    selectedMaterial
      ? {
          projectId,
          materialId: selectedMaterial.id,
          location: location.trim() || undefined,
        }
      : null,
    open && Boolean(selectedMaterial),
  );

  useEffect(() => {
    if (!open) return;
    if (selectedMaterial && unitOptions.length > 0) {
      if (!unit || !unitOptions.includes(unit as MaterialUnit)) {
        setUnit(unitOptions[0]!);
      }
    }
  }, [open, selectedMaterial, unit, unitOptions]);

  const reset = () => {
    setSelectedMaterial(null);
    setUnit('');
    setQuantity('');
    setLocation('');
    setSourceType(SourceType.Manual);
    setSourceId('');
    setExpiresAt('');
    setNotes('');
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

  const qty = Number(quantity);
  const canSubmit =
    Boolean(selectedMaterial) &&
    Boolean(unit) &&
    Number.isFinite(qty) &&
    qty > 0 &&
    !create.isPending;

  const submit = () => {
    if (!selectedMaterial || !unit) return;
    void (async () => {
      try {
        const row = await create.mutateAsync({
          projectId,
          materialId: selectedMaterial.id,
          unit,
          quantity: qty,
          location: location.trim() || undefined,
          sourceType,
          sourceId: sourceId.trim() || null,
          expiresAt: expiresAt.trim()
            ? new Date(expiresAt).toISOString()
            : null,
          notes: notes.trim() || null,
        });
        success('Stock reservation created');
        handleClose();
        onCreated(row.id);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Drawer anchor="right" open={open} onClose={handleClose}>
      <Stack
        spacing={2}
        sx={{ width: { xs: 320, sm: 440 }, p: 2.5 }}
        data-testid="create-stock-reservation-drawer"
      >
        <Typography variant="h6">Reserve stock</Typography>
        <Typography variant="body2" color="text.secondary">
          Soft-hold available quantity. Does not move ledger stock until issue
          or consumption.
        </Typography>

        <Autocomplete
          options={materialOptions}
          loading={materialLoading}
          value={selectedMaterial}
          onOpen={() => void searchMaterials('')}
          onInputChange={(_e, value, reason) => {
            if (reason === 'input') void searchMaterials(value);
          }}
          onChange={(_e, value) => setSelectedMaterial(value)}
          getOptionLabel={(opt) =>
            `${opt.materialCode} · ${opt.name}`
          }
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => (
            <TextField {...params} label="Material" required />
          )}
        />

        <TextField
          label="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          helperText="Warehouse / bin path key used by stock balances"
        />

        {availableQuery.data ? (
          <Alert severity="info" data-testid="available-stock-alert">
            On hand {formatQuantity(availableQuery.data.onHandBaseQty)} ·
            Reserved {formatQuantity(availableQuery.data.reservedBaseQty)} ·
            Available {formatQuantity(availableQuery.data.availableBaseQty)}{' '}
            (base unit)
          </Alert>
        ) : null}

        <FormControl fullWidth required disabled={!selectedMaterial}>
          <InputLabel id="reserve-unit-label">Unit</InputLabel>
          <Select
            labelId="reserve-unit-label"
            label="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as MaterialUnit)}
          >
            {unitOptions.map((u) => (
              <MenuItem key={u} value={u}>
                {materialUnitLabel(u)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Quantity"
          type="number"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
        />

        <FormControl fullWidth>
          <InputLabel id="reserve-source-label">Source</InputLabel>
          <Select
            labelId="reserve-source-label"
            label="Source"
            value={sourceType}
            onChange={(e) =>
              setSourceType(e.target.value as StockReservationSourceType)
            }
          >
            {STOCK_RESERVATION_SOURCE_OPTIONS.map((source) => (
              <MenuItem key={source} value={source}>
                {stockReservationSourceLabel(source)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Source id (optional)"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        />

        <TextField
          label="Expires at (optional)"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          label="Notes"
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={!canSubmit}
            data-testid="create-stock-reservation-submit"
          >
            Reserve
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
