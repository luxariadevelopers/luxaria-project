/**
 * Mirrors Nest public mappers / DTOs for purchase orders.
 * Quotation sourcing types live in `@/quotations` (reuse — do not duplicate).
 */

import { PurchaseOrderStatus } from '@/status';

export { PurchaseOrderStatus };
export type { PurchaseOrderStatus as PurchaseOrderStatusType } from '@/status';

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

export type PoAddress = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

/** Alias used by list scaffolding. */
export type PublicPoAddress = PoAddress;

export type PoAddressInput = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
};

export type PublicPurchaseOrderItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: MaterialUnit | string;
  rate: number;
  tax: number;
  discount: number;
  total: number;
  receivedQuantity: number;
  balanceQuantity: number;
};

export type PublicPurchaseOrder = {
  id: string;
  purchaseOrderNumber: string;
  projectId: string;
  purchaseRequestId: string;
  selectedQuotationId: string;
  vendorId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  billingAddress: PoAddress;
  deliveryAddress: PoAddress;
  paymentTerms: string | null;
  items: PublicPurchaseOrderItem[];
  subtotal: number;
  taxes: number;
  freight: number;
  discount: number;
  total: number;
  terms: string | null;
  status: PurchaseOrderStatus;
  revisionNumber: number;
  rootPurchaseOrderId: string | null;
  revisedFromId: string | null;
  approvalRequestId: string | null;
  issuedBy: string | null;
  issuedAt: string | null;
  pdfPath: string | null;
  pdfGeneratedAt: string | null;
  balanceQuantity: number;
  balanceAmount: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Nest `GET /purchase-orders/:id/balance` payload. */
export type PurchaseOrderBalance = {
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  status: PurchaseOrderStatus;
  balanceQuantity: number;
  balanceAmount: number;
  lines: Array<{
    lineId: string;
    materialId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    balanceQuantity: number;
    lineTotal: number;
  }>;
};

export type ListPurchaseOrdersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  purchaseRequestId?: string;
  vendorId?: string;
  status?: PurchaseOrderStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} | null;

export type PaginatedPurchaseOrders = {
  items: PublicPurchaseOrder[];
  meta: PaginationMeta;
};

export type PurchaseOrderItemInput = {
  materialId: string;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax?: number;
  discount?: number;
};

/** Nest `CreatePurchaseOrderDto` */
export type CreatePurchaseOrderInput = {
  projectId: string;
  purchaseRequestId: string;
  selectedQuotationId: string;
  vendorId?: string;
  orderDate: string;
  expectedDeliveryDate: string;
  billingAddress: PoAddressInput;
  deliveryAddress: PoAddressInput;
  paymentTerms?: string | null;
  items?: PurchaseOrderItemInput[];
  taxes?: number;
  freight?: number;
  discount?: number;
  terms?: string | null;
};

/** Nest `UpdatePurchaseOrderDto` (PartialType of create). */
export type UpdatePurchaseOrderInput = Partial<CreatePurchaseOrderInput>;

/** Approved quotation line used as the PO rate/qty source of truth. */
export type ApprovedSourceLine = {
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: MaterialUnit | string;
  rate: number;
  tax: number;
  discount: number;
};
