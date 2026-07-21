import type { SelectOption } from '@luxaria/shared-types';
import {
  ProjectAccessStatus,
  ProjectDocumentCategory,
  ProjectStage,
  ProjectStatus,
  ProjectType,
} from './types';

export const PROJECT_STATUS_OPTIONS: SelectOption[] = [
  { value: ProjectStatus.Planning, label: 'Planning' },
  { value: ProjectStatus.Approval, label: 'Approval' },
  { value: ProjectStatus.PreConstruction, label: 'Pre-construction' },
  { value: ProjectStatus.Construction, label: 'Construction' },
  { value: ProjectStatus.OnHold, label: 'On hold' },
  { value: ProjectStatus.Completed, label: 'Completed' },
  { value: ProjectStatus.Closed, label: 'Closed' },
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

export const PROJECT_STATUS_TRANSITIONS: Record<
  ProjectStatus,
  readonly ProjectStatus[]
> = {
  [ProjectStatus.Planning]: [
    ProjectStatus.Approval,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Approval]: [
    ProjectStatus.PreConstruction,
    ProjectStatus.Planning,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.PreConstruction]: [
    ProjectStatus.Construction,
    ProjectStatus.OnHold,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Construction]: [
    ProjectStatus.OnHold,
    ProjectStatus.Completed,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.OnHold]: [
    ProjectStatus.Planning,
    ProjectStatus.Approval,
    ProjectStatus.PreConstruction,
    ProjectStatus.Construction,
    ProjectStatus.Cancelled,
  ],
  [ProjectStatus.Completed]: [ProjectStatus.Closed],
  [ProjectStatus.Closed]: [],
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
