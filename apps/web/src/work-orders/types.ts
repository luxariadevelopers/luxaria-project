export type WorkOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'accepted'
  | 'in_progress'
  | 'partially_completed'
  | 'completed'
  | 'closed'
  | 'cancelled';

export type WorkOrderAmendmentType =
  | 'quantity'
  | 'rate'
  | 'scope'
  | 'time_extension'
  | 'revised_value'
  | 'mixed';

export type WorkOrderAmendmentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type WorkOrderResponsibility = 'company' | 'contractor' | 'shared';

export type PublicWorkOrderBoqLine = {
  id: string | null;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  value: number;
};

export type PublicWorkOrderRevision = {
  id: string | null;
  revision: number;
  amendmentId: string | null;
  contractValue: number;
  startDate: string;
  endDate: string;
  frozenAt: string;
  terms: string | null;
};

export type PublicWorkOrder = {
  id: string;
  workOrderNumber: string;
  activeRevision: number;
  projectId: string;
  siteId: string | null;
  contractorId: string;
  rateContractId: string | null;
  agreementId: string | null;
  boqScopeLines: PublicWorkOrderBoqLine[];
  locations: string[];
  startDate: string;
  endDate: string;
  contractValue: number;
  materialResponsibility: WorkOrderResponsibility;
  labourResponsibility: WorkOrderResponsibility;
  drawingIds: string[];
  terms: string | null;
  attachments: string[];
  revisions: PublicWorkOrderRevision[];
  status: WorkOrderStatus;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  issuedAt: string | null;
  acceptedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicWorkOrderAmendment = {
  id: string;
  amendmentNumber: string;
  workOrderId: string;
  projectId: string;
  targetRevision: number;
  baseRevision: number;
  type: WorkOrderAmendmentType;
  status: WorkOrderAmendmentStatus;
  reason: string;
  proposed: {
    contractValue: number;
    startDate: string;
    endDate: string;
    boqScopeLines: PublicWorkOrderBoqLine[];
  };
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
};

export type ListWorkOrdersQuery = {
  projectId?: string;
  siteId?: string;
  contractorId?: string;
  status?: WorkOrderStatus;
  page?: number;
  limit?: number;
};

export type PaginatedWorkOrders = {
  items: PublicWorkOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type CreateWorkOrderInput = {
  projectId: string;
  siteId?: string | null;
  contractorId: string;
  rateContractId?: string | null;
  agreementId?: string | null;
  boqScopeLines: Array<{
    boqItemId?: string | null;
    boqCode?: string | null;
    description: string;
    unit: string;
    quantity: number;
    rate: number;
  }>;
  locations?: string[];
  startDate: string;
  endDate: string;
  materialResponsibility?: WorkOrderResponsibility;
  labourResponsibility?: WorkOrderResponsibility;
  drawingIds?: string[];
  terms?: string | null;
  attachments?: string[];
  notes?: string | null;
};

export type UpdateWorkOrderInput = Partial<
  Omit<CreateWorkOrderInput, 'projectId' | 'contractorId'>
>;

export type CreateWorkOrderAmendmentInput = {
  type: WorkOrderAmendmentType;
  reason: string;
  boqScopeLines?: CreateWorkOrderInput['boqScopeLines'];
  locations?: string[];
  startDate?: string;
  endDate?: string;
  revisedValue?: number;
  terms?: string | null;
};
