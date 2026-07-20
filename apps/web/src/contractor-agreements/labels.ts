import {
  ContractorAgreementBillingCycle,
  ContractorAgreementExpiryAlertType,
  ContractorAgreementStatus,
} from './types';

const STATUS_LABELS: Record<ContractorAgreementStatus, string> = {
  [ContractorAgreementStatus.Draft]: 'Draft',
  [ContractorAgreementStatus.PendingApproval]: 'Pending approval',
  [ContractorAgreementStatus.Active]: 'Active',
  [ContractorAgreementStatus.Superseded]: 'Superseded',
  [ContractorAgreementStatus.Rejected]: 'Rejected',
  [ContractorAgreementStatus.Expired]: 'Expired',
  [ContractorAgreementStatus.Terminated]: 'Terminated',
};

export function agreementStatusLabel(
  status: ContractorAgreementStatus,
): string {
  return STATUS_LABELS[status] ?? status;
}

const BILLING_LABELS: Record<ContractorAgreementBillingCycle, string> = {
  [ContractorAgreementBillingCycle.Weekly]: 'Weekly',
  [ContractorAgreementBillingCycle.Fortnightly]: 'Fortnightly',
  [ContractorAgreementBillingCycle.Monthly]: 'Monthly',
  [ContractorAgreementBillingCycle.Milestone]: 'Milestone',
  [ContractorAgreementBillingCycle.Completion]: 'On completion',
};

export function billingCycleLabel(
  cycle: ContractorAgreementBillingCycle,
): string {
  return BILLING_LABELS[cycle] ?? cycle;
}

const ALERT_LABELS: Record<ContractorAgreementExpiryAlertType, string> = {
  [ContractorAgreementExpiryAlertType.ExpiringSoon]: 'Expiring soon',
  [ContractorAgreementExpiryAlertType.ExpiringCritical]: 'Critical',
  [ContractorAgreementExpiryAlertType.Expired]: 'Expired',
};

export function expiryAlertLabel(
  alertType: ContractorAgreementExpiryAlertType,
): string {
  return ALERT_LABELS[alertType] ?? alertType;
}

export const BILLING_CYCLE_OPTIONS = Object.values(
  ContractorAgreementBillingCycle,
).map((value) => ({
  value,
  label: billingCycleLabel(value),
}));

export const AGREEMENT_STATUS_OPTIONS = Object.values(
  ContractorAgreementStatus,
).map((value) => ({
  value,
  label: agreementStatusLabel(value),
}));
