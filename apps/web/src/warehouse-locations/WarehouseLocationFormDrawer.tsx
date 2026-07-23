import { useEffect, useMemo, useState } from 'react';
import {
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
import { formDrawerPaperSx } from '@/components/forms';
import { useNotify } from '@/components/NotificationProvider';
import {
  requiredParentLevel,
  WAREHOUSE_LOCATION_LEVEL_OPTIONS,
  WAREHOUSE_LOCATION_STATUS_OPTIONS,
  warehouseLocationLevelLabel,
  warehouseLocationStatusLabel,
} from './labels';
import type { WarehouseOption } from './WarehouseLocationFilters';
import {
  WarehouseLocationLevel,
  WarehouseLocationStatus,
  type PublicWarehouseLocation,
  type WarehouseLocationLevel as Level,
  type WarehouseLocationStatus as Status,
} from './types';
import {
  useCreateWarehouseLocation,
  useUpdateWarehouseLocation,
  useWarehouseLocationsList,
} from './useWarehouseLocations';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  warehouses: readonly WarehouseOption[];
  location?: PublicWarehouseLocation | null;
};

export function WarehouseLocationFormDrawer({
  open,
  onClose,
  projectId,
  warehouses,
  location,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateWarehouseLocation();
  const update = useUpdateWarehouseLocation();
  const isEdit = Boolean(location);

  const [warehouseId, setWarehouseId] = useState('');
  const [level, setLevel] = useState<Level>(WarehouseLocationLevel.Zone);
  const [parentId, setParentId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState<Status>(WarehouseLocationStatus.Active);

  const parentLevel = requiredParentLevel(level);
  const parentsQuery = useWarehouseLocationsList(
    {
      projectId,
      warehouseId: warehouseId || undefined,
      level: parentLevel ?? undefined,
      status: WarehouseLocationStatus.Active,
      limit: 100,
    },
    open && !isEdit && Boolean(warehouseId) && Boolean(parentLevel),
  );

  const parentOptions = useMemo(
    () => parentsQuery.data?.items ?? [],
    [parentsQuery.data?.items],
  );

  useEffect(() => {
    if (!open) return;
    if (location) {
      setWarehouseId(location.warehouseId);
      setLevel(location.level);
      setParentId(location.parentId ?? '');
      setCode(location.code);
      setName(location.name);
      setCapacity(
        location.capacity == null ? '' : String(location.capacity),
      );
      setStatus(location.status);
    } else {
      setWarehouseId(warehouses[0]?.id ?? '');
      setLevel(WarehouseLocationLevel.Zone);
      setParentId('');
      setCode('');
      setName('');
      setCapacity('');
      setStatus(WarehouseLocationStatus.Active);
    }
  }, [open, location, warehouses]);

  useEffect(() => {
    if (!open || isEdit) return;
    setParentId('');
  }, [level, warehouseId, open, isEdit]);

  const busy = create.isPending || update.isPending;
  const needsParent = Boolean(parentLevel);
  const capacityNum = capacity.trim() === '' ? null : Number(capacity);
  const canSubmit =
    Boolean(warehouseId) &&
    Boolean(code.trim()) &&
    Boolean(name.trim()) &&
    (!needsParent || Boolean(parentId)) &&
    (capacity.trim() === '' ||
      (Number.isFinite(capacityNum) && (capacityNum as number) >= 0)) &&
    !busy;

  const submit = () => {
    void (async () => {
      try {
        if (isEdit && location) {
          await update.mutateAsync({
            id: location.id,
            input: {
              name: name.trim(),
              capacity: capacityNum,
              status,
            },
          });
          success('Warehouse location updated');
        } else {
          await create.mutateAsync({
            projectId,
            warehouseId,
            level,
            parentId: needsParent ? parentId : null,
            code: code.trim(),
            name: name.trim(),
            capacity: capacityNum,
            status,
          });
          success('Warehouse location created');
        }
        onClose();
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: formDrawerPaperSx(440) } }}
    >
      <Stack
        spacing={2}
        sx={{ p: 2.5 }}
        data-testid="warehouse-location-form-drawer"
      >
        <Typography variant="h6">
          {isEdit ? 'Edit location' : 'New warehouse location'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hierarchy: Warehouse → Zone → Rack → Bin. Path keys are used by stock
          balances and reservations.
        </Typography>

        <FormControl fullWidth required disabled={isEdit}>
          <InputLabel id="wh-loc-form-warehouse">Warehouse</InputLabel>
          <Select
            labelId="wh-loc-form-warehouse"
            label="Warehouse"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouses.map((wh) => (
              <MenuItem key={wh.id} value={wh.id}>
                {wh.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth required disabled={isEdit}>
          <InputLabel id="wh-loc-form-level">Level</InputLabel>
          <Select
            labelId="wh-loc-form-level"
            label="Level"
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
          >
            {WAREHOUSE_LOCATION_LEVEL_OPTIONS.map((lvl) => (
              <MenuItem key={lvl} value={lvl}>
                {warehouseLocationLevelLabel(lvl)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {needsParent && !isEdit ? (
          <FormControl fullWidth required>
            <InputLabel id="wh-loc-form-parent">
              Parent {warehouseLocationLevelLabel(parentLevel!)}
            </InputLabel>
            <Select
              labelId="wh-loc-form-parent"
              label={`Parent ${warehouseLocationLevelLabel(parentLevel!)}`}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              {parentOptions.map((parent) => (
                <MenuItem key={parent.id} value={parent.id}>
                  {parent.locationPath} · {parent.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        <TextField
          label="Code"
          required
          value={code}
          disabled={isEdit}
          onChange={(e) => setCode(e.target.value)}
          helperText={
            isEdit
              ? 'Code cannot change after create (path stability)'
              : 'Short code, e.g. Z01'
          }
        />

        <TextField
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Capacity (optional)"
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
        />

        <FormControl fullWidth>
          <InputLabel id="wh-loc-form-status">Status</InputLabel>
          <Select
            labelId="wh-loc-form-status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {WAREHOUSE_LOCATION_STATUS_OPTIONS.map((st) => (
              <MenuItem key={st} value={st}>
                {warehouseLocationStatusLabel(st)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isEdit && location ? (
          <Typography variant="body2" color="text.secondary">
            Path: {location.locationPath}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={!canSubmit}
            data-testid="warehouse-location-form-submit"
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
