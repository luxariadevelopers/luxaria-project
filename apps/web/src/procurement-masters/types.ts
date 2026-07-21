/**
 * Mirrors Nest `Public*` shapes from
 * `apps/backend/src/modules/procurement-masters`.
 */

export const ProcurementMasterStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type ProcurementMasterStatus =
  (typeof ProcurementMasterStatus)[keyof typeof ProcurementMasterStatus];

export type MasterResource =
  | 'purchase-categories'
  | 'material-categories'
  | 'vendor-categories'
  | 'payment-terms'
  | 'delivery-terms'
  | 'tax-rules';

export type PublicCatalogItem = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  status: ProcurementMasterStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicPaymentTerm = PublicCatalogItem & { days: number };
export type PublicDeliveryTerm = PublicCatalogItem & {
  description: string | null;
};
export type PublicTaxRule = PublicCatalogItem & { gstPercent: number };

export type MasterRow =
  | PublicCatalogItem
  | PublicPaymentTerm
  | PublicDeliveryTerm
  | PublicTaxRule;

export type CreateCatalogInput = { code: string; name: string };
export type CreatePaymentTermInput = CreateCatalogInput & { days: number };
export type CreateDeliveryTermInput = CreateCatalogInput & {
  description?: string | null;
};
export type CreateTaxRuleInput = CreateCatalogInput & { gstPercent: number };

export type UpdateCatalogInput = Partial<CreateCatalogInput>;
export type UpdatePaymentTermInput = Partial<CreatePaymentTermInput>;
export type UpdateDeliveryTermInput = Partial<CreateDeliveryTermInput>;
export type UpdateTaxRuleInput = Partial<CreateTaxRuleInput>;

export type ListMastersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProcurementMasterStatus;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedMasters<T> = {
  items: T[];
  meta: PaginationMeta | null;
};
