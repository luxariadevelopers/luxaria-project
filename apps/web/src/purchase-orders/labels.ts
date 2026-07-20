import { getDomainStatusLabel } from '@/status';
import {
  MaterialUnit,
  PurchaseOrderStatus,
  type MaterialUnit as MaterialUnitType,
} from './types';

const UNIT_LABELS: Record<MaterialUnitType, string> = {
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

export function materialUnitLabel(unit: string): string {
  if (unit in UNIT_LABELS) {
    return UNIT_LABELS[unit as MaterialUnitType];
  }
  return unit.replace(/_/g, ' ');
}

export const MATERIAL_UNIT_OPTIONS = Object.values(MaterialUnit).map(
  (value) => ({
    value,
    label: materialUnitLabel(value),
  }),
);

export function purchaseOrderStatusLabel(status: string): string {
  return getDomainStatusLabel('purchaseOrder', status, status);
}

/** Delivery-focused labels for receipt pipeline badges. */
export function deliveryStatusLabel(status: string): string | null {
  if (status === PurchaseOrderStatus.PartiallyReceived) {
    return 'Partially received';
  }
  if (status === PurchaseOrderStatus.FullyReceived) {
    return 'Fully received';
  }
  if (status === PurchaseOrderStatus.Issued) {
    return 'Awaiting delivery';
  }
  return null;
}
