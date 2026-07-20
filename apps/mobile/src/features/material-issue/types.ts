/**
 * Mirrors Nest `PublicMaterialIssue` /
 * `apps/backend/src/modules/material-issues/material-issues.mapper.ts`.
 */

/** Nest `MaterialIssueStatus` */
export const MaterialIssueStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Confirmed: 'confirmed',
  Cancelled: 'cancelled',
} as const;

export type MaterialIssueStatus =
  (typeof MaterialIssueStatus)[keyof typeof MaterialIssueStatus];

/** Nest `MaterialUnit` (material-master schema). */
export const MaterialUnit = {
  Number: 'number',
  Bag: 'bag',
  Kilogram: 'kilogram',
  Ton: 'ton',
  Litre: 'litre',
  Metre: 'metre',
  SquareFoot: 'square_foot',
  CubicFoot: 'cubic_foot',
  Load: 'load',
  Box: 'box',
} as const;

export type MaterialUnit = (typeof MaterialUnit)[keyof typeof MaterialUnit];

export type PublicMaterialIssueItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  unit: MaterialUnit;
  quantity: number;
  baseUnit: MaterialUnit;
  baseUnitQuantity: number;
  returnedBaseQuantity: number;
  remainingBaseQuantity: number;
  batch: string | null;
  notes: string | null;
  stockLedgerEntryId: string | null;
};

export type PublicMaterialReturnItem = {
  id: string;
  materialId: string;
  unit: MaterialUnit;
  quantity: number;
  baseUnitQuantity: number;
  reason: string | null;
  stockLedgerEntryId: string | null;
};

export type PublicMaterialIssueReturn = {
  id: string;
  returnNumber: string;
  returnDate: string;
  returnedBy: string;
  items: PublicMaterialReturnItem[];
  notes: string | null;
  postedAt: string | null;
};

export type PublicMaterialIssueSignatures = {
  recipientSignatureDocumentId: string | null;
  recipientSignatureChecksum: string | null;
  issuerSignatureDocumentId: string | null;
  issuerSignatureChecksum: string | null;
  recipientSignedAt: string | null;
};

export type PublicMaterialIssue = {
  id: string;
  issueNumber: string;
  projectId: string;
  issueDate: string;
  issuedBy: string;
  receivedBy: string;
  contractorId: string | null;
  blockId: string | null;
  floorId: string | null;
  boqItemId: string;
  workLocation: string;
  storeLocation: string;
  items: PublicMaterialIssueItem[];
  signatures: PublicMaterialIssueSignatures;
  status: MaterialIssueStatus;
  returns: PublicMaterialIssueReturn[];
  notes: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MaterialReturnItemInput = {
  materialId: string;
  quantity: number;
  unit: MaterialUnit;
  reason?: string | null;
};

/** Nest `CreateMaterialReturnDto` */
export type CreateMaterialReturnInput = {
  returnDate: string;
  returnedBy?: string;
  notes?: string | null;
  items: MaterialReturnItemInput[];
};

export type ListMaterialIssuesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  status?: MaterialIssueStatus;
  contractorId?: string;
  boqItemId?: string;
};

export type MaterialIssueUserOption = {
  id: string;
  fullName: string;
  userCode: string;
  status: string;
};
