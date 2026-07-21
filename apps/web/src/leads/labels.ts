import { LeadSource, LeadStatus, type LeadSource as LeadSourceType, type LeadStatus as LeadStatusType } from './types';

const SOURCE_LABELS: Record<LeadSourceType, string> = {
  [LeadSource.WalkIn]: 'Walk-in',
  [LeadSource.Website]: 'Website',
  [LeadSource.Referral]: 'Referral',
  [LeadSource.ChannelPartner]: 'Channel partner',
  [LeadSource.ExistingCustomer]: 'Existing customer',
  [LeadSource.Broker]: 'Broker',
  [LeadSource.DigitalMarketing]: 'Digital marketing',
  [LeadSource.Campaign]: 'Campaign',
  [LeadSource.Other]: 'Other',
};

const STATUS_LABELS: Record<LeadStatusType, string> = {
  [LeadStatus.New]: 'New',
  [LeadStatus.Contacted]: 'Contacted',
  [LeadStatus.Qualified]: 'Qualified',
  [LeadStatus.SiteVisit]: 'Site visit',
  [LeadStatus.Proposal]: 'Proposal',
  [LeadStatus.Negotiation]: 'Negotiation',
  [LeadStatus.Won]: 'Won',
  [LeadStatus.Lost]: 'Lost',
};

export function leadSourceLabel(source: LeadSourceType): string {
  return SOURCE_LABELS[source] ?? source;
}

export function leadStatusLabel(status: LeadStatusType): string {
  return STATUS_LABELS[status] ?? status;
}

export const LEAD_SOURCE_OPTIONS = Object.values(LeadSource).map((value) => ({
  value,
  label: leadSourceLabel(value),
}));

export const LEAD_STATUS_OPTIONS = Object.values(LeadStatus).map((value) => ({
  value,
  label: leadStatusLabel(value),
}));
