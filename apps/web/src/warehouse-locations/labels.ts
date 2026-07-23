import {
  WarehouseLocationLevel,
  WarehouseLocationStatus,
} from './types';

export function warehouseLocationLevelLabel(level: string): string {
  switch (level) {
    case WarehouseLocationLevel.Zone:
      return 'Zone';
    case WarehouseLocationLevel.Rack:
      return 'Rack';
    case WarehouseLocationLevel.Bin:
      return 'Bin';
    default:
      return level;
  }
}

export function warehouseLocationStatusLabel(status: string): string {
  switch (status) {
    case WarehouseLocationStatus.Active:
      return 'Active';
    case WarehouseLocationStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export const WAREHOUSE_LOCATION_LEVEL_OPTIONS = Object.values(
  WarehouseLocationLevel,
);

export const WAREHOUSE_LOCATION_STATUS_OPTIONS = Object.values(
  WarehouseLocationStatus,
);

/** Parent level required for rack/bin creates. */
export function requiredParentLevel(
  level: string,
): typeof WarehouseLocationLevel.Zone | typeof WarehouseLocationLevel.Rack | null {
  if (level === WarehouseLocationLevel.Rack) {
    return WarehouseLocationLevel.Zone;
  }
  if (level === WarehouseLocationLevel.Bin) {
    return WarehouseLocationLevel.Rack;
  }
  return null;
}
