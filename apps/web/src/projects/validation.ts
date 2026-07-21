import { z } from 'zod';
import type { FieldPath } from 'react-hook-form';
import {
  ProjectAccessStatus,
  ProjectStage,
  ProjectStatus,
  ProjectType,
  type CreateProjectAssignmentInput,
  type CreateProjectInput,
  type PublicProject,
  type UpdateProjectAssignmentInput,
  type UpdateProjectInput,
} from './types';

const projectTypes = Object.values(ProjectType) as [
  ProjectType,
  ...ProjectType[],
];
const projectStatuses = Object.values(ProjectStatus) as [
  ProjectStatus,
  ...ProjectStatus[],
];
const projectStages = Object.values(ProjectStage) as [
  ProjectStage,
  ...ProjectStage[],
];
const accessStatuses = Object.values(ProjectAccessStatus) as [
  ProjectAccessStatus,
  ...ProjectAccessStatus[],
];

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const optionalDate = z.string().refine(
  (value) => value.trim() === '' || isCalendarDate(value),
  'Enter a valid date',
);

const requiredDate = z.string().refine(
  (value) => isCalendarDate(value),
  'Start date is required',
);

const optionalNumber = z.string().refine(
  (value) =>
    value.trim() === '' || Number.isFinite(Number(value)),
  'Enter a valid number',
);

function nonNegativeNumber(label: string) {
  return optionalNumber.refine(
    (value) => value.trim() === '' || Number(value) >= 0,
    `${label} cannot be negative`,
  );
}

function nonNegativeInteger(label: string) {
  return nonNegativeNumber(label).refine(
    (value) => value.trim() === '' || Number.isInteger(Number(value)),
    `${label} must be a whole number`,
  );
}

export const projectFormSchema = z
  .object({
    projectName: z.string().trim().min(1, 'Project name is required'),
    description: z.string(),
    projectType: z.enum(projectTypes),
    address: z.object({
      line1: z.string().trim().min(1, 'Address line 1 is required'),
      line2: z.string(),
      city: z.string().trim().min(1, 'City is required'),
      state: z.string().trim().min(1, 'State is required'),
      pincode: z
        .string()
        .trim()
        .regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN'),
      country: z.string().trim().min(1, 'Country is required'),
    }),
    latitude: optionalNumber.refine(
      (value) =>
        value.trim() === '' ||
        (Number(value) >= -90 && Number(value) <= 90),
      'Latitude must be between -90 and 90',
    ),
    longitude: optionalNumber.refine(
      (value) =>
        value.trim() === '' ||
        (Number(value) >= -180 && Number(value) <= 180),
      'Longitude must be between -180 and 180',
    ),
    siteRadiusMeters: nonNegativeNumber('Site radius'),
    landArea: nonNegativeNumber('Land area'),
    builtUpArea: nonNegativeNumber('Built-up area'),
    numberOfBlocks: nonNegativeInteger('Number of blocks'),
    numberOfUnits: nonNegativeInteger('Number of units'),
    startDate: optionalDate,
    expectedCompletionDate: optionalDate,
    actualCompletionDate: optionalDate,
    status: z.enum(projectStatuses),
    projectManager: z.string(),
    assignedDirectors: z.array(z.string()),
    defaultBankAccount: z.string(),
    approvedBudget: nonNegativeNumber('Approved budget'),
    projectStage: z.enum(projectStages),
    clientName: z.string(),
    currency: z.string(),
    timeZone: z.string(),
    reraDetails: z.object({
      reraNumber: z.string(),
      registrationDate: optionalDate,
      validUntil: optionalDate,
      authority: z.string(),
      notes: z.string(),
    }),
  })
  .superRefine((values, ctx) => {
    const hasLatitude = values.latitude.trim() !== '';
    const hasLongitude = values.longitude.trim() !== '';
    if (hasLatitude !== hasLongitude) {
      const path = hasLatitude ? ['longitude'] : ['latitude'];
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: 'Latitude and longitude must be provided together',
      });
    }

    if (
      values.startDate &&
      values.expectedCompletionDate &&
      values.expectedCompletionDate < values.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedCompletionDate'],
        message: 'Expected completion must be on or after the start date',
      });
    }

    if (
      values.startDate &&
      values.actualCompletionDate &&
      values.actualCompletionDate < values.startDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actualCompletionDate'],
        message: 'Actual completion must be on or after the start date',
      });
    }

    const registrationDate = values.reraDetails.registrationDate;
    const validUntil = values.reraDetails.validUntil;
    if (registrationDate && validUntil && validUntil < registrationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reraDetails', 'validUntil'],
        message: 'RERA validity must end on or after registration',
      });
    }
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalNumericValue(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

function optionalDateValue(value: string): string | null {
  return value.trim() === '' ? null : value;
}

export function buildProjectFormDefaults(
  project?: PublicProject | null,
): ProjectFormValues {
  return {
    projectName: project?.projectName ?? '',
    description: project?.description ?? '',
    projectType: project?.projectType ?? ProjectType.Residential,
    address: {
      line1: project?.address.line1 ?? '',
      line2: project?.address.line2 ?? '',
      city: project?.address.city ?? '',
      state: project?.address.state ?? '',
      pincode: project?.address.pincode ?? '',
      country: project?.address.country ?? 'India',
    },
    latitude: project?.latitude == null ? '' : String(project.latitude),
    longitude: project?.longitude == null ? '' : String(project.longitude),
    siteRadiusMeters:
      project?.siteRadiusMeters == null
        ? ''
        : String(project.siteRadiusMeters),
    landArea: project?.landArea == null ? '' : String(project.landArea),
    builtUpArea:
      project?.builtUpArea == null ? '' : String(project.builtUpArea),
    numberOfBlocks:
      project?.numberOfBlocks == null ? '' : String(project.numberOfBlocks),
    numberOfUnits:
      project?.numberOfUnits == null ? '' : String(project.numberOfUnits),
    startDate: project?.startDate?.slice(0, 10) ?? '',
    expectedCompletionDate:
      project?.expectedCompletionDate?.slice(0, 10) ?? '',
    actualCompletionDate:
      project?.actualCompletionDate?.slice(0, 10) ?? '',
    status: project?.status ?? ProjectStatus.Draft,
    projectManager: project?.projectManager ?? '',
    assignedDirectors: project?.assignedDirectors ?? [],
    defaultBankAccount: project?.defaultBankAccount ?? '',
    approvedBudget:
      project?.approvedBudget == null ? '' : String(project.approvedBudget),
    projectStage: project?.projectStage ?? ProjectStage.Concept,
    clientName: project?.clientName ?? '',
    currency: project?.currency ?? 'INR',
    timeZone: project?.timeZone ?? 'Asia/Kolkata',
    reraDetails: {
      reraNumber: project?.reraDetails.reraNumber ?? '',
      registrationDate:
        project?.reraDetails.registrationDate?.slice(0, 10) ?? '',
      validUntil: project?.reraDetails.validUntil?.slice(0, 10) ?? '',
      authority: project?.reraDetails.authority ?? '',
      notes: project?.reraDetails.notes ?? '',
    },
  };
}

export function toCreateProjectInput(
  values: ProjectFormValues,
  companyId?: string | null,
): CreateProjectInput {
  return {
    projectName: values.projectName.trim(),
    description: optionalString(values.description),
    projectType: values.projectType,
    address: {
      line1: values.address.line1.trim(),
      line2: optionalString(values.address.line2),
      city: values.address.city.trim(),
      state: values.address.state.trim(),
      pincode: values.address.pincode.trim(),
      country: values.address.country.trim(),
    },
    latitude: optionalNumericValue(values.latitude),
    longitude: optionalNumericValue(values.longitude),
    siteRadiusMeters: optionalNumericValue(values.siteRadiusMeters),
    landArea: optionalNumericValue(values.landArea),
    builtUpArea: optionalNumericValue(values.builtUpArea),
    numberOfBlocks: optionalNumericValue(values.numberOfBlocks),
    numberOfUnits: optionalNumericValue(values.numberOfUnits),
    startDate: optionalDateValue(values.startDate),
    expectedCompletionDate: optionalDateValue(
      values.expectedCompletionDate,
    ),
    status: values.status,
    clientName: optionalString(values.clientName),
    currency: values.currency.trim() || 'INR',
    timeZone: values.timeZone.trim() || 'Asia/Kolkata',
    projectManager: optionalString(values.projectManager),
    assignedDirectors: values.assignedDirectors,
    defaultBankAccount: optionalString(values.defaultBankAccount),
    approvedBudget: optionalNumericValue(values.approvedBudget),
    projectStage: values.projectStage,
    reraDetails: {
      reraNumber: optionalString(values.reraDetails.reraNumber),
      registrationDate: optionalDateValue(
        values.reraDetails.registrationDate,
      ),
      validUntil: optionalDateValue(values.reraDetails.validUntil),
      authority: optionalString(values.reraDetails.authority),
      notes: optionalString(values.reraDetails.notes),
    },
    // Omit when unknown — backend resolves the authenticated tenant.
    ...(companyId ? { companyId } : {}),
  };
}

export function toUpdateProjectInput(
  values: ProjectFormValues,
): UpdateProjectInput {
  const createShape = toCreateProjectInput(values, 'server-controlled');
  return {
    projectName: createShape.projectName,
    description: createShape.description,
    projectType: createShape.projectType,
    address: createShape.address,
    latitude: createShape.latitude,
    longitude: createShape.longitude,
    siteRadiusMeters: createShape.siteRadiusMeters,
    landArea: createShape.landArea,
    builtUpArea: createShape.builtUpArea,
    numberOfBlocks: createShape.numberOfBlocks,
    numberOfUnits: createShape.numberOfUnits,
    startDate: createShape.startDate,
    expectedCompletionDate: createShape.expectedCompletionDate,
    actualCompletionDate: optionalDateValue(values.actualCompletionDate),
    clientName: createShape.clientName,
    currency: createShape.currency,
    timeZone: createShape.timeZone,
    defaultBankAccount: createShape.defaultBankAccount,
    approvedBudget: createShape.approvedBudget,
    projectStage: createShape.projectStage,
    reraDetails: createShape.reraDetails,
  };
}

export const projectAssignmentFormSchema = z
  .object({
    userId: z.string().trim().min(1, 'User is required'),
    accessStartDate: requiredDate,
    accessEndDate: optionalDate,
    status: z.enum(accessStatuses),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (
      values.accessEndDate &&
      values.accessEndDate < values.accessStartDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accessEndDate'],
        message: 'End date must be on or after the start date',
      });
    }
  });

export type ProjectAssignmentFormValues = z.infer<
  typeof projectAssignmentFormSchema
>;

export function toCreateAssignmentInput(
  values: ProjectAssignmentFormValues,
  projectId: string,
): CreateProjectAssignmentInput {
  return {
    userId: values.userId,
    projectId,
    globalAccess: false,
    accessStartDate: values.accessStartDate,
    accessEndDate: optionalDateValue(values.accessEndDate),
    notes: optionalString(values.notes),
  };
}

export function toUpdateAssignmentInput(
  values: ProjectAssignmentFormValues,
): UpdateProjectAssignmentInput {
  return {
    accessStartDate: values.accessStartDate,
    accessEndDate: optionalDateValue(values.accessEndDate),
    status: values.status,
    notes: optionalString(values.notes),
  };
}

const projectFieldPaths = new Set<FieldPath<ProjectFormValues>>([
  'projectName',
  'description',
  'projectType',
  'address.line1',
  'address.line2',
  'address.city',
  'address.state',
  'address.pincode',
  'address.country',
  'latitude',
  'longitude',
  'siteRadiusMeters',
  'landArea',
  'builtUpArea',
  'numberOfBlocks',
  'numberOfUnits',
  'startDate',
  'expectedCompletionDate',
  'actualCompletionDate',
  'status',
  'clientName',
  'currency',
  'timeZone',
  'projectManager',
  'assignedDirectors',
  'defaultBankAccount',
  'approvedBudget',
  'projectStage',
  'reraDetails.reraNumber',
  'reraDetails.registrationDate',
  'reraDetails.validUntil',
  'reraDetails.authority',
  'reraDetails.notes',
]);

export function resolveProjectFormField(
  serverField: string,
): FieldPath<ProjectFormValues> | null {
  const normalised = serverField
    .replace(/^body\./, '')
    .replace(/\[(\w+)\]/g, '.$1');
  return projectFieldPaths.has(normalised as FieldPath<ProjectFormValues>)
    ? (normalised as FieldPath<ProjectFormValues>)
    : null;
}
