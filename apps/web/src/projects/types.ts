export const ProjectStatus = {
  Planning: 'Planning',
  Approval: 'Approval',
  PreConstruction: 'Pre-Construction',
  Construction: 'Construction',
  OnHold: 'On Hold',
  Completed: 'Completed',
  Closed: 'Closed',
  Cancelled: 'Cancelled',
} as const;

export type ProjectStatus =
  (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ProjectType = {
  Residential: 'residential',
  Commercial: 'commercial',
  MixedUse: 'mixed_use',
  Plotting: 'plotting',
  Infrastructure: 'infrastructure',
  Other: 'other',
} as const;

export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

export const ProjectStage = {
  Concept: 'concept',
  Design: 'design',
  Approvals: 'approvals',
  Mobilisation: 'mobilisation',
  Structure: 'structure',
  Finishing: 'finishing',
  Handover: 'handover',
  Closed: 'closed',
} as const;

export type ProjectStage = (typeof ProjectStage)[keyof typeof ProjectStage];

export type ProjectAddress = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type ProjectReraDetails = {
  reraNumber: string | null;
  registrationDate: string | null;
  validUntil: string | null;
  authority: string | null;
  notes: string | null;
};

export type PublicProject = {
  id: string;
  projectCode: string;
  projectName: string;
  description: string | null;
  projectType: ProjectType;
  address: ProjectAddress;
  latitude: number | null;
  longitude: number | null;
  siteRadiusMeters: number | null;
  landArea: number | null;
  builtUpArea: number | null;
  numberOfBlocks: number | null;
  numberOfUnits: number | null;
  startDate: string | null;
  expectedCompletionDate: string | null;
  actualCompletionDate: string | null;
  status: ProjectStatus;
  projectManager: string | null;
  assignedDirectors: string[];
  defaultBankAccount: string | null;
  approvedBudget: number | null;
  projectStage: ProjectStage;
  reraDetails: ProjectReraDetails;
  companyId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedProjects = {
  items: PublicProject[];
  meta: ProjectPaginationMeta;
};

export type ListProjectsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: ProjectStatus;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectManagerId?: string;
  directorId?: string;
  companyId?: string;
};

export type CreateProjectInput = {
  projectName: string;
  description?: string | null;
  projectType: ProjectType;
  address: ProjectAddress;
  latitude?: number | null;
  longitude?: number | null;
  siteRadiusMeters?: number | null;
  landArea?: number | null;
  builtUpArea?: number | null;
  numberOfBlocks?: number | null;
  numberOfUnits?: number | null;
  startDate?: string | null;
  expectedCompletionDate?: string | null;
  status?: ProjectStatus;
  projectManager?: string | null;
  assignedDirectors?: string[];
  defaultBankAccount?: string | null;
  approvedBudget?: number | null;
  projectStage?: ProjectStage;
  reraDetails?: ProjectReraDetails;
  companyId?: string | null;
};

export type UpdateProjectInput = {
  projectName?: string;
  description?: string | null;
  projectType?: ProjectType;
  address?: ProjectAddress;
  latitude?: number | null;
  longitude?: number | null;
  siteRadiusMeters?: number | null;
  landArea?: number | null;
  builtUpArea?: number | null;
  numberOfBlocks?: number | null;
  numberOfUnits?: number | null;
  startDate?: string | null;
  expectedCompletionDate?: string | null;
  actualCompletionDate?: string | null;
  defaultBankAccount?: string | null;
  approvedBudget?: number | null;
  projectStage?: ProjectStage;
  reraDetails?: ProjectReraDetails;
};

export type UpdateProjectStatusInput = {
  status: ProjectStatus;
  actualCompletionDate?: string | null;
  note?: string | null;
};

export const ProjectDocumentCategory = {
  General: 'general',
  Approval: 'approval',
  Rera: 'rera',
  Contract: 'contract',
  Drawing: 'drawing',
  Photo: 'photo',
  Other: 'other',
} as const;

export type ProjectDocumentCategory =
  (typeof ProjectDocumentCategory)[keyof typeof ProjectDocumentCategory];

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
  createdAt?: string;
};

export type PaginatedProjectDocuments = {
  items: PublicProjectDocument[];
  meta: ProjectPaginationMeta;
};

export const ProjectAccessStatus = {
  Active: 'active',
  Inactive: 'inactive',
  Expired: 'expired',
} as const;

export type ProjectAccessStatus =
  (typeof ProjectAccessStatus)[keyof typeof ProjectAccessStatus];

export type PublicProjectAssignment = {
  id: string;
  userId: string;
  projectId: string | null;
  globalAccess: boolean;
  accessStartDate: string;
  accessEndDate: string | null;
  status: ProjectAccessStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginatedProjectAssignments = {
  items: PublicProjectAssignment[];
  meta: ProjectPaginationMeta;
};

export type ListProjectAssignmentsQuery = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  projectId?: string;
  status?: ProjectAccessStatus;
};

export type CreateProjectAssignmentInput = {
  userId: string;
  projectId: string;
  globalAccess?: false;
  accessStartDate: string;
  accessEndDate?: string | null;
  notes?: string | null;
};

export type UpdateProjectAssignmentInput = {
  accessStartDate?: string;
  accessEndDate?: string | null;
  status?: ProjectAccessStatus;
  notes?: string | null;
};

export type ProjectUserOption = {
  id: string;
  userCode: string;
  fullName: string;
  email: string | null;
  designation: string | null;
  department: string | null;
  status: string;
};

export type ProjectBankOption = {
  id: string;
  accountCode: string;
  bankName: string;
  maskedAccountNumber: string;
  status: string;
};

export type ProjectCompany = {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName: string;
  isPrimary: boolean;
};
