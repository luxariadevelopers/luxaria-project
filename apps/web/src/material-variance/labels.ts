import { MaterialConsumptionAlert } from './types';

/** Default from Nest `MATERIAL_CONSUMPTION_VARIANCE_THRESHOLD_PERCENT`. */
export const DEFAULT_VARIANCE_THRESHOLD_PERCENT = 5;

export const ALERT_LABELS: Record<MaterialConsumptionAlert, string> = {
  [MaterialConsumptionAlert.AboveAllowedVariance]: 'Above allowed variance',
  [MaterialConsumptionAlert.NegativeConsumption]: 'Negative consumption',
  [MaterialConsumptionAlert.MaterialIssueWithoutProgress]:
    'Material issued without progress',
  [MaterialConsumptionAlert.ProgressWithoutMaterialIssue]:
    'Progress without material issue',
  [MaterialConsumptionAlert.UnexplainedStockShortage]:
    'Unexplained stock shortage',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  cancelled: 'Cancelled',
};

export function formatQty(value: number, digits = 3): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });
}

export function formatPct(value: number): string {
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
}

export function lineLabel(line: {
  boqCode: string | null;
  materialCode: string | null;
  materialName: string | null;
}): string {
  const boq = line.boqCode ?? 'BOQ';
  const mat = line.materialName ?? line.materialCode ?? 'Material';
  return `${boq} · ${mat}`;
}
