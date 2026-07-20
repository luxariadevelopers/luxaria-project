import {
  MaterialUnit,
  PurchaseRequestLineStatus,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from './types';

export function purchaseRequestStatusLabel(
  status: PurchaseRequestStatus | string,
): string {
  switch (status) {
    case PurchaseRequestStatus.Draft:
      return 'Draft';
    case PurchaseRequestStatus.Submitted:
      return 'Submitted';
    case PurchaseRequestStatus.Reviewed:
      return 'Reviewed';
    case PurchaseRequestStatus.Approved:
      return 'Approved';
    case PurchaseRequestStatus.Sourcing:
      return 'Sourcing';
    case PurchaseRequestStatus.Closed:
      return 'Closed';
    case PurchaseRequestStatus.Rejected:
      return 'Rejected';
    case PurchaseRequestStatus.Returned:
      return 'Returned';
    case PurchaseRequestStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function purchaseRequestLineStatusLabel(
  status: PurchaseRequestLineStatus | string,
): string {
  switch (status) {
    case PurchaseRequestLineStatus.Pending:
      return 'Pending';
    case PurchaseRequestLineStatus.Approved:
      return 'Approved';
    case PurchaseRequestLineStatus.PartiallyApproved:
      return 'Partially approved';
    case PurchaseRequestLineStatus.Rejected:
      return 'Rejected';
    default:
      return status;
  }
}

export function purchaseRequestPriorityLabel(
  priority: PurchaseRequestPriority | string,
): string {
  switch (priority) {
    case PurchaseRequestPriority.Low:
      return 'Low';
    case PurchaseRequestPriority.Normal:
      return 'Normal';
    case PurchaseRequestPriority.High:
      return 'High';
    case PurchaseRequestPriority.Urgent:
      return 'Urgent';
    default:
      return priority;
  }
}

export function materialUnitLabel(unit: MaterialUnit | string): string {
  switch (unit) {
    case MaterialUnit.Number:
      return 'Number';
    case MaterialUnit.Bag:
      return 'Bag';
    case MaterialUnit.Kilogram:
      return 'Kilogram';
    case MaterialUnit.Ton:
      return 'Ton';
    case MaterialUnit.Litre:
      return 'Litre';
    case MaterialUnit.Metre:
      return 'Metre';
    case MaterialUnit.SquareFoot:
      return 'Square foot';
    case MaterialUnit.CubicFoot:
      return 'Cubic foot';
    case MaterialUnit.Load:
      return 'Load';
    case MaterialUnit.Box:
      return 'Box';
    default:
      return unit;
  }
}

export const PRIORITY_OPTIONS = [
  {
    value: PurchaseRequestPriority.Low,
    label: purchaseRequestPriorityLabel(PurchaseRequestPriority.Low),
  },
  {
    value: PurchaseRequestPriority.Normal,
    label: purchaseRequestPriorityLabel(PurchaseRequestPriority.Normal),
  },
  {
    value: PurchaseRequestPriority.High,
    label: purchaseRequestPriorityLabel(PurchaseRequestPriority.High),
  },
  {
    value: PurchaseRequestPriority.Urgent,
    label: purchaseRequestPriorityLabel(PurchaseRequestPriority.Urgent),
  },
] as const;
