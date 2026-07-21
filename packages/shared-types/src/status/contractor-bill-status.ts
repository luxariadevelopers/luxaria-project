/**
 * Source: `apps/backend/src/modules/contractor-bills/schemas/contractor-bill.schema.ts`
 * Editable: `contractor-bills.validation.ts` (`EDITABLE_BILL_STATUSES`).
 * Transitions: `contractor-bills.service.ts`.
 * Phase 6 aliases: see `contractor-bills/CTR-INTEGRATION.md`.
 */
import { createStatusCatalog } from './create-status-catalog';

export const ContractorBillStatus = {
  Draft: 'draft',
  Claimed: 'claimed',
  EngineerVerified: 'engineer_verified',
  PmCertified: 'pm_certified',
  FinanceVerified: 'finance_verified',
  DirectorApproved: 'director_approved',
  Posted: 'posted',
  PartiallyPaid: 'partially_paid',
  Paid: 'paid',
  Closed: 'closed',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;

export type ContractorBillStatus =
  (typeof ContractorBillStatus)[keyof typeof ContractorBillStatus];

export const EDITABLE_CONTRACTOR_BILL_STATUSES: readonly ContractorBillStatus[] =
  [ContractorBillStatus.Draft, ContractorBillStatus.Rejected];

export const contractorBillStatusCatalog = createStatusCatalog({
  values: Object.values(ContractorBillStatus) as ContractorBillStatus[],
  labels: {
    draft: 'Draft',
    claimed: 'Claimed',
    engineer_verified: 'Engineer Verified',
    pm_certified: 'PM Certified',
    finance_verified: 'Finance Verified',
    director_approved: 'Director Approved',
    posted: 'Posted',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    closed: 'Closed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  },
  badgeVariants: {
    draft: 'neutral',
    claimed: 'info',
    engineer_verified: 'info',
    pm_certified: 'info',
    finance_verified: 'warning',
    director_approved: 'warning',
    posted: 'success',
    partially_paid: 'warning',
    paid: 'success',
    closed: 'muted',
    rejected: 'danger',
    cancelled: 'muted',
  },
  transitions: {
    draft: ['claimed', 'cancelled'],
    claimed: ['engineer_verified', 'rejected', 'cancelled'],
    engineer_verified: ['pm_certified', 'rejected', 'cancelled'],
    pm_certified: ['finance_verified', 'rejected', 'cancelled'],
    finance_verified: ['director_approved', 'rejected', 'cancelled'],
    director_approved: ['posted', 'rejected', 'cancelled'],
    posted: ['partially_paid', 'paid'],
    partially_paid: ['paid'],
    paid: ['closed'],
    closed: [],
    rejected: ['draft', 'cancelled'],
    cancelled: [],
  },
  editable: EDITABLE_CONTRACTOR_BILL_STATUSES,
  immutable: ['posted', 'partially_paid', 'paid', 'closed', 'cancelled'],
});
