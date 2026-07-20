import {
  MaterialIssueStatus,
  MaterialUnit,
  type MaterialIssueStatus as Status,
  type MaterialUnit as Unit,
} from './types';

export function materialIssueStatusLabel(status: string): string {
  switch (status) {
    case MaterialIssueStatus.Draft:
      return 'Draft';
    case MaterialIssueStatus.Submitted:
      return 'Submitted';
    case MaterialIssueStatus.Confirmed:
      return 'Confirmed';
    case MaterialIssueStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

const UNIT_LABELS: Record<Unit, string> = {
  [MaterialUnit.Number]: 'Number',
  [MaterialUnit.Bag]: 'Bag',
  [MaterialUnit.Kilogram]: 'Kilogram',
  [MaterialUnit.Ton]: 'Ton',
  [MaterialUnit.Litre]: 'Litre',
  [MaterialUnit.Metre]: 'Metre',
  [MaterialUnit.SquareFoot]: 'Sq ft',
  [MaterialUnit.CubicFoot]: 'Cu ft',
  [MaterialUnit.Load]: 'Load',
  [MaterialUnit.Box]: 'Box',
};

export function materialUnitLabel(unit: Unit | string): string {
  if (unit in UNIT_LABELS) {
    return UNIT_LABELS[unit as Unit];
  }
  return unit;
}

export const MATERIAL_ISSUE_STATUS_OPTIONS: Array<{
  value: Status | '';
  label: string;
}> = [
  { value: '', label: 'All statuses' },
  {
    value: MaterialIssueStatus.Draft,
    label: materialIssueStatusLabel(MaterialIssueStatus.Draft),
  },
  {
    value: MaterialIssueStatus.Submitted,
    label: materialIssueStatusLabel(MaterialIssueStatus.Submitted),
  },
  {
    value: MaterialIssueStatus.Confirmed,
    label: materialIssueStatusLabel(MaterialIssueStatus.Confirmed),
  },
  {
    value: MaterialIssueStatus.Cancelled,
    label: materialIssueStatusLabel(MaterialIssueStatus.Cancelled),
  },
];

export const MATERIAL_UNIT_OPTIONS = Object.values(MaterialUnit).map(
  (unit) => ({
    value: unit,
    label: materialUnitLabel(unit),
  }),
);
