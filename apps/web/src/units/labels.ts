import {
  UnitFacing,
  UnitStatus,
  UnitType,
  type PublicUnit,
  type UnitFacing as Facing,
  type UnitStatus as Status,
  type UnitType as Type,
} from './types';

export const UNIT_STATUS_LABELS: Record<Status, string> = {
  [UnitStatus.Available]: 'Available',
  [UnitStatus.Held]: 'Held',
  [UnitStatus.Reserved]: 'Reserved',
  [UnitStatus.Booked]: 'Booked',
  [UnitStatus.AgreementExecuted]: 'Agreement executed',
  [UnitStatus.Registered]: 'Registered',
  [UnitStatus.Cancelled]: 'Cancelled',
  [UnitStatus.Blocked]: 'Blocked',
};

export const UNIT_STATUS_OPTIONS = (
  Object.values(UnitStatus) as Status[]
).map((value) => ({
  value,
  label: UNIT_STATUS_LABELS[value],
}));

export const UNIT_TYPE_LABELS: Record<Type, string> = {
  [UnitType.Studio]: 'Studio',
  [UnitType.OneBhk]: '1 BHK',
  [UnitType.TwoBhk]: '2 BHK',
  [UnitType.ThreeBhk]: '3 BHK',
  [UnitType.FourBhk]: '4 BHK',
  [UnitType.Penthouse]: 'Penthouse',
  [UnitType.Villa]: 'Villa',
  [UnitType.Shop]: 'Shop',
  [UnitType.Office]: 'Office',
  [UnitType.Plot]: 'Plot',
  [UnitType.Other]: 'Other',
};

export const UNIT_TYPE_OPTIONS = (Object.values(UnitType) as Type[]).map(
  (value) => ({
    value,
    label: UNIT_TYPE_LABELS[value],
  }),
);

export const UNIT_FACING_LABELS: Record<Facing, string> = {
  [UnitFacing.North]: 'North',
  [UnitFacing.South]: 'South',
  [UnitFacing.East]: 'East',
  [UnitFacing.West]: 'West',
  [UnitFacing.NorthEast]: 'North-east',
  [UnitFacing.NorthWest]: 'North-west',
  [UnitFacing.SouthEast]: 'South-east',
  [UnitFacing.SouthWest]: 'South-west',
  [UnitFacing.Other]: 'Other',
};

export const UNIT_FACING_OPTIONS = (Object.values(UnitFacing) as Facing[]).map(
  (value) => ({
    value,
    label: UNIT_FACING_LABELS[value],
  }),
);

export function unitStatusLabel(status: Status | string): string {
  if (status in UNIT_STATUS_LABELS) {
    return UNIT_STATUS_LABELS[status as Status];
  }
  return String(status);
}

export function unitTypeLabel(type: Type | string): string {
  if (type in UNIT_TYPE_LABELS) {
    return UNIT_TYPE_LABELS[type as Type];
  }
  return String(type);
}

export function unitFacingLabel(facing: Facing | string | null): string {
  if (!facing) return '—';
  if (facing in UNIT_FACING_LABELS) {
    return UNIT_FACING_LABELS[facing as Facing];
  }
  return String(facing);
}

export function unitDisplayCode(unit: PublicUnit): string {
  return `${unit.block}-${unit.unitNumber}`;
}

export function unitSubtitle(unit: PublicUnit): string {
  return [
    unit.block,
    `Floor ${unit.floor}`,
    unitTypeLabel(unit.unitType),
  ].join(' · ');
}
