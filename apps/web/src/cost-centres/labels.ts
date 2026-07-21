import {
  CostCentreKind,
  CostCentreStatus,
  type CostCentreKind as Kind,
  type CostCentreStatus as Status,
} from './types';

export function costCentreKindLabel(kind: Kind): string {
  switch (kind) {
    case CostCentreKind.CostCentre:
      return 'Cost centre';
    case CostCentreKind.ProfitCentre:
      return 'Profit centre';
    default:
      return kind;
  }
}

export function costCentreStatusLabel(status: Status): string {
  switch (status) {
    case CostCentreStatus.Active:
      return 'Active';
    case CostCentreStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}
