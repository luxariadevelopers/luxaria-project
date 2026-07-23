import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import {
  WAREHOUSE_LOCATION_LEVEL_OPTIONS,
  WAREHOUSE_LOCATION_STATUS_OPTIONS,
  warehouseLocationLevelLabel,
  warehouseLocationStatusLabel,
} from './labels';
import type {
  WarehouseLocationFilterState,
  WarehouseLocationLevel,
  WarehouseLocationStatus,
} from './types';

export type WarehouseOption = {
  id: string;
  label: string;
};

type Props = {
  value: WarehouseLocationFilterState;
  warehouses: readonly WarehouseOption[];
  onChange: (next: WarehouseLocationFilterState) => void;
};

export function WarehouseLocationFilters({
  value,
  warehouses,
  onChange,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="warehouse-location-filters"
    >
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="wh-loc-warehouse-label">Warehouse</InputLabel>
        <Select
          labelId="wh-loc-warehouse-label"
          label="Warehouse"
          value={value.warehouseId}
          onChange={(e) =>
            onChange({ ...value, warehouseId: e.target.value })
          }
        >
          <MenuItem value="">All warehouses</MenuItem>
          {warehouses.map((wh) => (
            <MenuItem key={wh.id} value={wh.id}>
              {wh.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="wh-loc-level-label">Level</InputLabel>
        <Select
          labelId="wh-loc-level-label"
          label="Level"
          value={value.level}
          onChange={(e) =>
            onChange({
              ...value,
              level: e.target.value as '' | WarehouseLocationLevel,
            })
          }
        >
          <MenuItem value="">All levels</MenuItem>
          {WAREHOUSE_LOCATION_LEVEL_OPTIONS.map((level) => (
            <MenuItem key={level} value={level}>
              {warehouseLocationLevelLabel(level)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="wh-loc-status-label">Status</InputLabel>
        <Select
          labelId="wh-loc-status-label"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as '' | WarehouseLocationStatus,
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {WAREHOUSE_LOCATION_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {warehouseLocationStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
