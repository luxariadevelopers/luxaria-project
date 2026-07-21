import {
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from './types';

export function contractorStatusLabel(status: string): string {
  switch (status) {
    case ContractorStatus.Draft:
      return 'Draft';
    case ContractorStatus.PendingVerification:
      return 'Pending verification';
    case ContractorStatus.Active:
      return 'Active';
    case ContractorStatus.Suspended:
      return 'Suspended';
    case ContractorStatus.Blocked:
      return 'Blacklisted';
    case ContractorStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export function contractorVerificationLabel(status: string): string {
  switch (status) {
    case ContractorVerificationStatus.Pending:
      return 'Pending';
    case ContractorVerificationStatus.Verified:
      return 'Verified';
    case ContractorVerificationStatus.Rejected:
      return 'Rejected';
    default:
      return status;
  }
}

export function contractorTypeLabel(type: string): string {
  switch (type) {
    case ContractorType.Labour:
      return 'Labour';
    case ContractorType.Civil:
      return 'Civil';
    case ContractorType.Electrical:
      return 'Electrical';
    case ContractorType.Plumbing:
      return 'Plumbing';
    case ContractorType.Finishing:
      return 'Finishing';
    case ContractorType.Specialist:
      return 'Specialist';
    case ContractorType.General:
      return 'General';
    case ContractorType.Other:
      return 'Other';
    default:
      return type;
  }
}

export const CONTRACTOR_TYPE_OPTIONS = Object.values(ContractorType).map(
  (value) => ({
    value,
    label: contractorTypeLabel(value),
  }),
);

export function contractorDocumentCategoryLabel(category: string): string {
  switch (category) {
    case 'general':
      return 'General';
    case 'agreement':
      return 'Agreement';
    case 'pan':
      return 'PAN';
    case 'gst':
      return 'GST';
    case 'bank_proof':
      return 'Bank proof';
    case 'labour_licence':
      return 'Labour licence';
    case 'insurance':
      return 'Insurance';
    case 'cancelled_cheque':
      return 'Cancelled cheque';
    case 'other':
      return 'Other';
    default:
      return category;
  }
}

export function contractorProjectAssignmentStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    default:
      return status;
  }
}
