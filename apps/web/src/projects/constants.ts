import type { SelectOption } from '@luxaria/shared-types';
import {
  ProjectAccessStatus,
  ProjectDocumentCategory,
  ProjectStage,
  ProjectStatus,
  ProjectTeamRole,
  ProjectType,
  StructureSiteType,
  WarehouseKind,
} from './types';

export const PROJECT_STATUS_OPTIONS: SelectOption[] = [
  { value: ProjectStatus.Draft, label: 'Draft' },
  { value: ProjectStatus.Planning, label: 'Planning' },
  { value: ProjectStatus.Approval, label: 'Approval' },
  { value: ProjectStatus.PreConstruction, label: 'Pre-construction' },
  { value: ProjectStatus.Construction, label: 'Construction' },
  { value: ProjectStatus.Active, label: 'Active' },
  { value: ProjectStatus.OnHold, label: 'On hold' },
  { value: ProjectStatus.Completed, label: 'Completed' },
  { value: ProjectStatus.Closed, label: 'Closed' },
  { value: ProjectStatus.Archived, label: 'Archived' },
  { value: ProjectStatus.Cancelled, label: 'Cancelled' },
];

export const PROJECT_TYPE_OPTIONS: SelectOption[] = [
  { value: ProjectType.Residential, label: 'Residential' },
  { value: ProjectType.Commercial, label: 'Commercial' },
  { value: ProjectType.MixedUse, label: 'Mixed use' },
  { value: ProjectType.Plotting, label: 'Plotting' },
  { value: ProjectType.Infrastructure, label: 'Infrastructure' },
  { value: ProjectType.Other, label: 'Other' },
];

export const PROJECT_STAGE_OPTIONS: SelectOption[] = [
  { value: ProjectStage.Concept, label: 'Concept' },
  { value: ProjectStage.Design, label: 'Design' },
  { value: ProjectStage.Approvals, label: 'Approvals' },
  { value: ProjectStage.Mobilisation, label: 'Mobilisation' },
  { value: ProjectStage.Structure, label: 'Structure' },
  { value: ProjectStage.Finishing, label: 'Finishing' },
  { value: ProjectStage.Handover, label: 'Handover' },
  { value: ProjectStage.Closed, label: 'Closed' },
];

export const PROJECT_DOCUMENT_CATEGORY_OPTIONS: SelectOption[] = Object.values(
  ProjectDocumentCategory,
).map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export const PROJECT_ACCESS_STATUS_OPTIONS: SelectOption[] = Object.values(
  ProjectAccessStatus,
).map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export const PROJECT_TEAM_ROLE_OPTIONS: SelectOption[] = [
  { value: ProjectTeamRole.Director, label: 'Director' },
  { value: ProjectTeamRole.ProjectDirector, label: 'Project director' },
  { value: ProjectTeamRole.ProjectManager, label: 'Project manager' },
  {
    value: ProjectTeamRole.ConstructionManager,
    label: 'Construction manager',
  },
  { value: ProjectTeamRole.SiteEngineer, label: 'Site engineer' },
  { value: ProjectTeamRole.JuniorEngineer, label: 'Junior engineer' },
  { value: ProjectTeamRole.QuantitySurveyor, label: 'Quantity surveyor' },
  { value: ProjectTeamRole.BillingEngineer, label: 'Billing engineer' },
  { value: ProjectTeamRole.Procurement, label: 'Procurement' },
  { value: ProjectTeamRole.Accountant, label: 'Accountant' },
  { value: ProjectTeamRole.StoreKeeper, label: 'Store keeper' },
];

export const STRUCTURE_NODE_TYPE_OPTIONS: SelectOption[] = [
  { value: StructureSiteType.Site, label: 'Site' },
  { value: StructureSiteType.Phase, label: 'Phase' },
  { value: StructureSiteType.Block, label: 'Block' },
  { value: StructureSiteType.Tower, label: 'Tower' },
  { value: StructureSiteType.Floor, label: 'Floor' },
];

export const WAREHOUSE_KIND_OPTIONS: SelectOption[] = [
  { value: WarehouseKind.MainStore, label: 'Main store' },
  { value: WarehouseKind.SiteStore, label: 'Site store' },
  { value: WarehouseKind.TemporaryStore, label: 'Temporary store' },
  { value: WarehouseKind.ScrapYard, label: 'Scrap yard' },
];

export const PROJECT_SETTINGS_FLAG_OPTIONS: Array<{
  key: keyof import('./types').ProjectSettings;
  label: string;
}> = [
  { key: 'dprEnabled', label: 'Daily progress reports' },
  { key: 'labourEnabled', label: 'Labour' },
  { key: 'inventoryEnabled', label: 'Inventory' },
  { key: 'equipmentEnabled', label: 'Equipment' },
  { key: 'procurementEnabled', label: 'Procurement' },
  { key: 'pettyCashEnabled', label: 'Petty cash' },
  { key: 'boqEnabled', label: 'BOQ' },
  { key: 'billingEnabled', label: 'Billing' },
  { key: 'customerBookingEnabled', label: 'Customer booking' },
];

export const PROJECT_LIST_SORT_KEYS = [
  'createdAt',
  'updatedAt',
  'projectName',
  'projectCode',
  'status',
  'startDate',
  'expectedCompletionDate',
] as const;

export const PROJECT_LIST_FILTER_KEYS = [
  'status',
  'projectType',
  'projectStage',
] as const;

/**
 * Mirrors `ALLOWED_STATUS_TRANSITIONS` in
 * `apps/backend/src/modules/projects/projects.validation.ts`.
 */
export const PROJECT_STATUS_TRANSITIONS: Record<
  ProjectStatus,
  readonly ProjectStatus[]
> = {
  [ProjectStatus.Draft]: [ProjectStatus.Planning, ProjectStatus.Cancelled],
  [ProjectStatus.Planning]: [
    ProjectStatus.Approval,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
    ProjectStatus.Draft,
  ],
  [ProjectStatus.Approval]: [
    ProjectStatus.Active,
    ProjectStatus.PreConstruction,
    ProjectStatus.Planning,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.PreConstruction]: [
    ProjectStatus.Active,
    ProjectStatus.Construction,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Construction]: [
    ProjectStatus.Active,
    ProjectStatus.OnHold,
    ProjectStatus.Completed,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Active]: [
    ProjectStatus.OnHold,
    ProjectStatus.Completed,
    ProjectStatus.Cancelled,
    ProjectStatus.Construction,
  ],
  [ProjectStatus.OnHold]: [
    ProjectStatus.Planning,
    ProjectStatus.Approval,
    ProjectStatus.PreConstruction,
    ProjectStatus.Construction,
    ProjectStatus.Active,
  ],
  [ProjectStatus.Completed]: [ProjectStatus.Closed],
  [ProjectStatus.Closed]: [ProjectStatus.Archived],
  [ProjectStatus.Archived]: [ProjectStatus.Closed],
  [ProjectStatus.Cancelled]: [],
};

export function projectTypeLabel(value: string): string {
  return (
    PROJECT_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function projectStageLabel(value: string): string {
  return (
    PROJECT_STAGE_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function projectTeamRoleLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return (
    PROJECT_TEAM_ROLE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}
