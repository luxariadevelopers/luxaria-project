import type { Types } from 'mongoose';
import type { AddressEmbed } from '../company/schemas/address.embed';
import type { ProjectFinancialConfigEmbed } from './schemas/project-financial-config.embed';
import type { ProjectDocumentCategory } from './schemas/project-document.schema';
import type { ProjectSettingsEmbed } from './schemas/project-settings.embed';
import type { ReraDetailsEmbed } from './schemas/rera-details.embed';
import type { ProjectStage, ProjectStatus, ProjectType } from './schemas/project.schema';

export type PublicProject = {
  id: string;
  projectCode: string;
  projectName: string;
  description: string | null;
  projectType: ProjectType;
  address: AddressEmbed;
  latitude: number | null;
  longitude: number | null;
  siteRadiusMeters: number | null;
  landArea: number | null;
  builtUpArea: number | null;
  numberOfBlocks: number | null;
  numberOfUnits: number | null;
  startDate: Date | null;
  expectedCompletionDate: Date | null;
  actualCompletionDate: Date | null;
  status: ProjectStatus;
  statusBeforeHold: ProjectStatus | null;
  clientName: string | null;
  currency: string;
  timeZone: string;
  financialYearId: string | null;
  settings: ProjectSettingsEmbed;
  financialConfig: ProjectFinancialConfigEmbed;
  projectManager: string | null;
  assignedDirectors: string[];
  defaultBankAccount: string | null;
  approvedBudget: number | null;
  projectStage: ProjectStage;
  reraDetails: ReraDetailsEmbed;
  companyId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type ProjectLike = {
  _id: Types.ObjectId | string;
  projectCode: string;
  projectName: string;
  description?: string | null;
  projectType: ProjectType;
  address: AddressEmbed;
  latitude?: number | null;
  longitude?: number | null;
  siteRadiusMeters?: number | null;
  landArea?: number | null;
  builtUpArea?: number | null;
  numberOfBlocks?: number | null;
  numberOfUnits?: number | null;
  startDate?: Date | null;
  expectedCompletionDate?: Date | null;
  actualCompletionDate?: Date | null;
  status: ProjectStatus;
  statusBeforeHold?: ProjectStatus | null;
  clientName?: string | null;
  currency?: string | null;
  timeZone?: string | null;
  financialYearId?: Types.ObjectId | string | null;
  settings?: ProjectSettingsEmbed | null;
  financialConfig?: ProjectFinancialConfigEmbed | null;
  projectManager?: Types.ObjectId | string | null;
  assignedDirectors?: Array<Types.ObjectId | string>;
  defaultBankAccount?: Types.ObjectId | string | null;
  approvedBudget?: number | null;
  projectStage: ProjectStage;
  reraDetails?: ReraDetailsEmbed;
  companyId?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const EMPTY_SETTINGS: ProjectSettingsEmbed = {
  dprEnabled: true,
  labourEnabled: true,
  inventoryEnabled: true,
  inventoryCostingMethod: 'weighted_average',
  equipmentEnabled: false,
  procurementEnabled: true,
  pettyCashEnabled: true,
  boqEnabled: true,
  billingEnabled: true,
  customerBookingEnabled: true,
};

const EMPTY_FINANCIAL: ProjectFinancialConfigEmbed = {
  costCentreCodes: [],
  profitCentreCode: null,
  defaultGstPercent: null,
  defaultCurrency: null,
  taxNotes: null,
  budgetCategories: [],
};

export function toPublicProject(project: ProjectLike): PublicProject {
  return {
    id: String(project._id),
    projectCode: project.projectCode,
    projectName: project.projectName,
    description: project.description ?? null,
    projectType: project.projectType,
    address: project.address,
    latitude: project.latitude ?? null,
    longitude: project.longitude ?? null,
    siteRadiusMeters: project.siteRadiusMeters ?? null,
    landArea: project.landArea ?? null,
    builtUpArea: project.builtUpArea ?? null,
    numberOfBlocks: project.numberOfBlocks ?? null,
    numberOfUnits: project.numberOfUnits ?? null,
    startDate: project.startDate ?? null,
    expectedCompletionDate: project.expectedCompletionDate ?? null,
    actualCompletionDate: project.actualCompletionDate ?? null,
    status: project.status,
    statusBeforeHold: project.statusBeforeHold ?? null,
    clientName: project.clientName ?? null,
    currency: project.currency ?? 'INR',
    timeZone: project.timeZone ?? 'Asia/Kolkata',
    financialYearId: project.financialYearId
      ? String(project.financialYearId)
      : null,
    settings: project.settings ?? EMPTY_SETTINGS,
    financialConfig: project.financialConfig ?? EMPTY_FINANCIAL,
    projectManager: project.projectManager ? String(project.projectManager) : null,
    assignedDirectors: (project.assignedDirectors ?? []).map((id) => String(id)),
    defaultBankAccount: project.defaultBankAccount
      ? String(project.defaultBankAccount)
      : null,
    approvedBudget: project.approvedBudget ?? null,
    projectStage: project.projectStage,
    reraDetails: project.reraDetails ?? {
      reraNumber: null,
      registrationDate: null,
      validUntil: null,
      authority: null,
      notes: null,
    },
    companyId: project.companyId ? String(project.companyId) : null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export type PublicProjectDocument = {
  id: string;
  projectId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: ProjectDocumentCategory;
  version: number;
  description: string | null;
  uploadedBy: string | null;
  createdAt?: Date;
};
