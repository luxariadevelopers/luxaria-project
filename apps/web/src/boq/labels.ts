import {
  BoqItemStatus,
  BoqUnit,
  BoqVersionStatus,
  BoqVersionType,
  type BoqItemStatus as BoqItemStatusT,
  type BoqUnit as BoqUnitT,
  type BoqVersionStatus as BoqVersionStatusT,
  type BoqVersionType as BoqVersionTypeT,
  type PublicBoqVersion,
} from './types';

const UNIT_LABELS: Record<BoqUnitT, string> = {
  [BoqUnit.Number]: 'Number',
  [BoqUnit.Bag]: 'Bag',
  [BoqUnit.Kilogram]: 'Kilogram',
  [BoqUnit.Ton]: 'Ton',
  [BoqUnit.Litre]: 'Litre',
  [BoqUnit.Metre]: 'Metre',
  [BoqUnit.SquareFoot]: 'Sq ft',
  [BoqUnit.CubicFoot]: 'Cu ft',
  [BoqUnit.SquareMetre]: 'Sq m',
  [BoqUnit.CubicMetre]: 'Cu m',
  [BoqUnit.RunningMetre]: 'Running m',
  [BoqUnit.Load]: 'Load',
  [BoqUnit.Box]: 'Box',
  [BoqUnit.Job]: 'Job',
  [BoqUnit.Day]: 'Day',
  [BoqUnit.LumpSum]: 'Lump sum',
};

const ITEM_STATUS_LABELS: Record<BoqItemStatusT, string> = {
  [BoqItemStatus.Draft]: 'Draft',
  [BoqItemStatus.Active]: 'Active',
  [BoqItemStatus.OnHold]: 'On hold',
  [BoqItemStatus.Completed]: 'Completed',
  [BoqItemStatus.Cancelled]: 'Cancelled',
};

const VERSION_STATUS_LABELS: Record<BoqVersionStatusT, string> = {
  [BoqVersionStatus.Draft]: 'Draft',
  [BoqVersionStatus.PendingApproval]: 'Pending approval',
  [BoqVersionStatus.Active]: 'Active',
  [BoqVersionStatus.Superseded]: 'Superseded',
  [BoqVersionStatus.Rejected]: 'Rejected',
};

const VERSION_TYPE_LABELS: Record<BoqVersionTypeT, string> = {
  [BoqVersionType.Original]: 'Original',
  [BoqVersionType.Revision]: 'Revision',
  [BoqVersionType.Variation]: 'Variation',
  [BoqVersionType.ChangeOrder]: 'Change order',
};

export function boqUnitLabel(unit: BoqUnitT): string {
  return UNIT_LABELS[unit] ?? unit;
}

export function boqItemStatusLabel(status: BoqItemStatusT): string {
  return ITEM_STATUS_LABELS[status] ?? status;
}

export function boqVersionStatusLabel(status: BoqVersionStatusT): string {
  return VERSION_STATUS_LABELS[status] ?? status;
}

export function boqVersionTypeLabel(type: BoqVersionTypeT): string {
  return VERSION_TYPE_LABELS[type] ?? type;
}

export function formatBoqVersionLabel(version: PublicBoqVersion): string {
  return `v${version.versionNumber} · ${boqVersionTypeLabel(version.versionType)}`;
}

export function formatBoqVersionLabel(version: {
  versionNumber: number;
  versionType: BoqVersionTypeT;
}): string {
  return `v${version.versionNumber} · ${boqVersionTypeLabel(version.versionType)}`;
}

export const BOQ_UNIT_OPTIONS = Object.values(BoqUnit).map((value) => ({
  value,
  label: boqUnitLabel(value),
}));

export const BOQ_ITEM_STATUS_OPTIONS = Object.values(BoqItemStatus).map(
  (value) => ({ value, label: boqItemStatusLabel(value) }),
);

export const BOQ_VERSION_TYPE_OPTIONS = Object.values(BoqVersionType).map(
  (value) => ({ value, label: boqVersionTypeLabel(value) }),
);

export const BOQ_UNIT_OPTIONS = Object.values(BoqUnit).map((value) => ({
  value,
  label: boqUnitLabel(value),
}));

export const BOQ_VERSION_TYPE_OPTIONS = Object.values(BoqVersionType).map(
  (value) => ({ value, label: boqVersionTypeLabel(value) }),
);
