import {
  LabourCategoryRateStatus,
  LabourCategoryStatus,
  LabourSkillLevel,
  RateScopeKind,
  type LabourCategoryRateStatus as RateStatus,
  type LabourCategoryStatus as Status,
  type LabourSkillLevel as Skill,
  type RateScopeKind as Scope,
} from './types';

export function labourCategoryStatusLabel(status: Status | string): string {
  switch (status) {
    case LabourCategoryStatus.Active:
      return 'Active';
    case LabourCategoryStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export function labourSkillLevelLabel(level: Skill | string): string {
  switch (level) {
    case LabourSkillLevel.Unskilled:
      return 'Unskilled';
    case LabourSkillLevel.SemiSkilled:
      return 'Semi-skilled';
    case LabourSkillLevel.Skilled:
      return 'Skilled';
    case LabourSkillLevel.HighlySkilled:
      return 'Highly skilled';
    case LabourSkillLevel.Supervisory:
      return 'Supervisory';
    default:
      return level;
  }
}

export function labourRateStatusLabel(status: RateStatus | string): string {
  switch (status) {
    case LabourCategoryRateStatus.Active:
      return 'Active';
    case LabourCategoryRateStatus.Inactive:
      return 'Inactive';
    default:
      return status;
  }
}

export function rateScopeKindLabel(kind: Scope | string): string {
  switch (kind) {
    case RateScopeKind.ProjectContractor:
      return 'Project + contractor';
    case RateScopeKind.Project:
      return 'Project';
    case RateScopeKind.Contractor:
      return 'Contractor';
    case RateScopeKind.Company:
      return 'Company default';
    default:
      return kind;
  }
}

export function rateScopeLabel(rate: {
  projectId: string | null;
  contractorId: string | null;
}): string {
  if (rate.projectId && rate.contractorId) return 'Project + contractor';
  if (rate.projectId) return 'Project';
  if (rate.contractorId) return 'Contractor';
  return 'Company';
}
