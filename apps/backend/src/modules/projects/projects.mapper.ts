import type { Types } from 'mongoose';
import type { AddressEmbed } from '../company/schemas/address.embed';
import type { ProjectDocumentCategory } from './schemas/project-document.schema';
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
  description: string | null;
  uploadedBy: string | null;
  createdAt?: Date;
};
