export type PublicPurchaseRequest = {
  id: string;
  requestNumber: string;
  projectId: string;
  requiredByDate: string;
  priority: string;
  status: string;
  justification: string;
};

export type CreatePurchaseRequestInput = {
  projectId: string;
  requiredByDate: string;
  priority?: string;
  justification: string;
  items: Array<{
    materialId: string;
    requestedQuantity: number;
    unit: string;
    estimatedRate?: number | null;
    remarks?: string | null;
  }>;
};

export type MaterialOption = {
  id: string;
  materialCode: string;
  materialName: string;
  baseUnit?: string;
};
