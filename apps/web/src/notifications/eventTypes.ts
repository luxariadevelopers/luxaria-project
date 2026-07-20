/**
 * Mirrors `NotificationEventType` in
 * `apps/backend/src/modules/notifications/notifications.constants.ts`.
 */
export const NotificationEventType = {
  ApprovalPending: 'approval_pending',
  ApprovalRejected: 'approval_rejected',
  PaymentDue: 'payment_due',
  PaymentOverdue: 'payment_overdue',
  LowStock: 'low_stock',
  StockOutForecast: 'stock_out_forecast',
  MaterialVariance: 'material_variance',
  LabourShortfall: 'labour_shortfall',
  ContractorAgreementExpiry: 'contractor_agreement_expiry',
  MissingDpr: 'missing_dpr',
  PettyCashSettlementDelay: 'petty_cash_settlement_delay',
  CustomerPaymentOverdue: 'customer_payment_overdue',
  InvestorContributionOverdue: 'investor_contribution_overdue',
  BudgetOverrun: 'budget_overrun',
  DirectorDailyDigest: 'director_daily_digest',
} as const;

export type NotificationEventTypeCode =
  (typeof NotificationEventType)[keyof typeof NotificationEventType];

export const ALL_NOTIFICATION_EVENT_TYPES = Object.values(
  NotificationEventType,
) as NotificationEventTypeCode[];

const EVENT_LABELS: Record<NotificationEventTypeCode, string> = {
  approval_pending: 'Approval pending',
  approval_rejected: 'Approval rejected',
  payment_due: 'Payment due',
  payment_overdue: 'Payment overdue',
  low_stock: 'Low stock',
  stock_out_forecast: 'Stock-out forecast',
  material_variance: 'Material variance',
  labour_shortfall: 'Labour shortfall',
  contractor_agreement_expiry: 'Agreement expiry',
  missing_dpr: 'Missing DPR',
  petty_cash_settlement_delay: 'Petty cash delay',
  customer_payment_overdue: 'Customer overdue',
  investor_contribution_overdue: 'Contribution overdue',
  budget_overrun: 'Budget overrun',
  director_daily_digest: 'Director digest',
};

export function isNotificationEventType(
  value: string,
): value is NotificationEventTypeCode {
  return (ALL_NOTIFICATION_EVENT_TYPES as readonly string[]).includes(value);
}

export function getEventTypeLabel(eventType: string): string {
  if (isNotificationEventType(eventType)) {
    return EVENT_LABELS[eventType];
  }
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
