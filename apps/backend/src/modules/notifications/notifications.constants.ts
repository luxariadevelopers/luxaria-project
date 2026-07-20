export const NOTIFICATIONS_QUEUE = 'notifications';

export const NOTIFICATION_JOB_DELIVER = 'notification.deliver';
export const NOTIFICATION_JOB_PROCESS_SCHEDULED =
  'notification.process_scheduled';

export enum NotificationChannel {
  InApp = 'in_app',
  Push = 'push',
  Email = 'email',
  WhatsApp = 'whatsapp',
}

export enum NotificationEventType {
  ApprovalPending = 'approval_pending',
  ApprovalRejected = 'approval_rejected',
  PaymentDue = 'payment_due',
  PaymentOverdue = 'payment_overdue',
  LowStock = 'low_stock',
  StockOutForecast = 'stock_out_forecast',
  MaterialVariance = 'material_variance',
  LabourShortfall = 'labour_shortfall',
  ContractorAgreementExpiry = 'contractor_agreement_expiry',
  MissingDpr = 'missing_dpr',
  PettyCashSettlementDelay = 'petty_cash_settlement_delay',
  CustomerPaymentOverdue = 'customer_payment_overdue',
  InvestorContributionOverdue = 'investor_contribution_overdue',
  BudgetOverrun = 'budget_overrun',
  DirectorDailyDigest = 'director_daily_digest',
}

export enum NotificationDeliveryStatus {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
  Skipped = 'skipped',
  Retrying = 'retrying',
}

export enum ScheduledNotificationStatus {
  Pending = 'pending',
  Queued = 'queued',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

export const ALL_NOTIFICATION_CHANNELS = Object.values(NotificationChannel);

export const ALL_NOTIFICATION_EVENTS = Object.values(NotificationEventType);

export const DEFAULT_CHANNEL_SET: NotificationChannel[] = [
  NotificationChannel.InApp,
  NotificationChannel.Push,
  NotificationChannel.Email,
];
