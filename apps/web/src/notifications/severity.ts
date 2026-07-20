import {
  NotificationEventType,
  type NotificationEventTypeCode,
  isNotificationEventType,
} from './eventTypes';

/**
 * Display-only severity for badges. Backend has no severity field —
 * derived from known `eventType` values for UX.
 */
export type NotificationDisplaySeverity = 'info' | 'warning' | 'critical';

const CRITICAL: readonly NotificationEventTypeCode[] = [
  NotificationEventType.PaymentOverdue,
  NotificationEventType.StockOutForecast,
  NotificationEventType.BudgetOverrun,
  NotificationEventType.CustomerPaymentOverdue,
  NotificationEventType.InvestorContributionOverdue,
];

const WARNING: readonly NotificationEventTypeCode[] = [
  NotificationEventType.ApprovalRejected,
  NotificationEventType.PaymentDue,
  NotificationEventType.LowStock,
  NotificationEventType.MaterialVariance,
  NotificationEventType.LabourShortfall,
  NotificationEventType.ContractorAgreementExpiry,
  NotificationEventType.MissingDpr,
  NotificationEventType.PettyCashSettlementDelay,
];

export function getDisplaySeverity(
  eventType: string,
): NotificationDisplaySeverity {
  if (!isNotificationEventType(eventType)) {
    return 'info';
  }
  if (CRITICAL.includes(eventType)) {
    return 'critical';
  }
  if (WARNING.includes(eventType)) {
    return 'warning';
  }
  return 'info';
}

export function getSeverityLabel(
  severity: NotificationDisplaySeverity,
): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    default:
      return 'Info';
  }
}
