import {
  MaterialStatus,
  MaterialUnit,
  StockTransactionType,
  type MaterialUnit as MaterialUnitType,
  type PublicMaterial,
} from './types';

export const MATERIAL_UNIT_LABELS: Record<MaterialUnitType, string> = {
  [MaterialUnit.Number]: 'Number',
  [MaterialUnit.Bag]: 'Bag',
  [MaterialUnit.Kilogram]: 'Kilogram',
  [MaterialUnit.Ton]: 'Ton',
  [MaterialUnit.Litre]: 'Litre',
  [MaterialUnit.Metre]: 'Metre',
  [MaterialUnit.SquareFoot]: 'Square Foot',
  [MaterialUnit.CubicFoot]: 'Cubic Foot',
  [MaterialUnit.Load]: 'Load',
  [MaterialUnit.Box]: 'Box',
};

export const MATERIAL_UNIT_OPTIONS = (
  Object.values(MaterialUnit) as MaterialUnitType[]
).map((value) => ({
  value,
  label: MATERIAL_UNIT_LABELS[value],
}));

export const MATERIAL_STATUS_OPTIONS = [
  { value: MaterialStatus.Active, label: 'Active' },
  { value: MaterialStatus.Inactive, label: 'Inactive' },
] as const;

export function materialUnitLabel(unit: MaterialUnitType | string): string {
  if (unit in MATERIAL_UNIT_LABELS) {
    return MATERIAL_UNIT_LABELS[unit as MaterialUnitType];
  }
  return String(unit);
}

export function materialStatusLabel(status: MaterialStatus | string): string {
  if (status === MaterialStatus.Active) return 'Active';
  if (status === MaterialStatus.Inactive) return 'Inactive';
  return String(status);
}

export function conversionRuleLabel(
  factor: { unit: MaterialUnit; factorToBase: number },
  baseUnit: MaterialUnit,
): string {
  return `1 ${materialUnitLabel(factor.unit)} = ${factor.factorToBase} ${materialUnitLabel(baseUnit)}`;
}

export function materialSubtitle(material: PublicMaterial): string {
  const parts = [material.category];
  if (material.brand) parts.push(material.brand);
  return parts.join(' · ');
}

export function stockTransactionTypeLabel(
  type: StockTransactionType | string,
): string {
  const labels: Record<string, string> = {
    [StockTransactionType.OpeningStock]: 'Opening stock',
    [StockTransactionType.PurchaseReceipt]: 'Purchase receipt',
    [StockTransactionType.TransferIn]: 'Transfer in',
    [StockTransactionType.TransferOut]: 'Transfer out',
    [StockTransactionType.MaterialIssue]: 'Material issue',
    [StockTransactionType.ReturnFromWork]: 'Return from work',
    [StockTransactionType.ReturnToVendor]: 'Return to vendor',
    [StockTransactionType.Wastage]: 'Wastage',
    [StockTransactionType.Damage]: 'Damage',
    [StockTransactionType.TheftOrShortage]: 'Theft / shortage',
    [StockTransactionType.Adjustment]: 'Adjustment',
    [StockTransactionType.Reversal]: 'Reversal',
  };
  return labels[type] ?? type;
}

/** Conversion rule display: 1 × alternate = factor × base. */
