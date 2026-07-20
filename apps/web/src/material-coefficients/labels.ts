import { BoqUnit } from './units';
import { MaterialCoefficientStatus } from './types';

const BOQ_UNIT_LABELS: Record<BoqUnit, string> = {
  [BoqUnit.Number]: 'Number',
  [BoqUnit.Bag]: 'Bag',
  [BoqUnit.Kilogram]: 'Kilogram',
  [BoqUnit.Ton]: 'Ton',
  [BoqUnit.Litre]: 'Litre',
  [BoqUnit.Metre]: 'Metre',
  [BoqUnit.SquareFoot]: 'Square Foot',
  [BoqUnit.CubicFoot]: 'Cubic Foot',
  [BoqUnit.SquareMetre]: 'Square Metre',
  [BoqUnit.CubicMetre]: 'Cubic Metre',
  [BoqUnit.RunningMetre]: 'Running Metre',
  [BoqUnit.Load]: 'Load',
  [BoqUnit.Box]: 'Box',
  [BoqUnit.Job]: 'Job',
  [BoqUnit.Day]: 'Day',
  [BoqUnit.LumpSum]: 'Lump Sum',
};

const STATUS_LABELS: Record<MaterialCoefficientStatus, string> = {
  [MaterialCoefficientStatus.Draft]: 'Draft',
  [MaterialCoefficientStatus.PendingApproval]: 'Pending approval',
  [MaterialCoefficientStatus.Active]: 'Active',
  [MaterialCoefficientStatus.Superseded]: 'Superseded',
  [MaterialCoefficientStatus.Rejected]: 'Rejected',
};

export function boqUnitLabel(unit: BoqUnit): string {
  return BOQ_UNIT_LABELS[unit] ?? unit;
}

export function materialCoefficientStatusLabel(
  status: MaterialCoefficientStatus,
): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatCoefficientVersionLabel(input: {
  standardNumber: string;
  version: number;
}): string {
  return `${input.standardNumber} (v${input.version})`;
}

export const BOQ_UNIT_OPTIONS = Object.values(BoqUnit).map((value) => ({
  value,
  label: boqUnitLabel(value),
}));
