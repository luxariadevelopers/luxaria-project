import type {
  ContractorRecoveryStatus,
  ContractorRecoveryType,
} from './api';

const TYPE_LABELS: Record<ContractorRecoveryType, string> = {
  mobilization_advance: 'Mobilization advance',
  secured_advance: 'Secured advance',
  retention: 'Retention',
  security_deposit: 'Security deposit',
  material: 'Material',
  equipment: 'Equipment',
  electricity_water: 'Electricity / water',
  labour_welfare: 'Labour welfare',
  damage: 'Damage',
  penalty: 'Penalty',
  tds: 'TDS',
  gst_tds: 'GST TDS',
  manual: 'Manual',
};

export function recoveryTypeLabel(type: ContractorRecoveryType): string {
  return TYPE_LABELS[type] ?? type.replaceAll('_', ' ');
}

export const RECOVERY_TYPE_OPTIONS = (
  Object.keys(TYPE_LABELS) as ContractorRecoveryType[]
).map((value) => ({
  value,
  label: recoveryTypeLabel(value),
}));

const STATUS_LABELS: Record<ContractorRecoveryStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  posted: 'Posted',
};

export function recoveryStatusLabel(status: ContractorRecoveryStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export const RECOVERY_STATUS_OPTIONS = (
  Object.keys(STATUS_LABELS) as ContractorRecoveryStatus[]
).map((value) => ({
  value,
  label: recoveryStatusLabel(value),
}));
