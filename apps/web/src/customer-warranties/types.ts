export const WarrantyStatus = {
  Complaint: 'complaint',
  Inspection: 'inspection',
  Assigned: 'assigned',
  Rectified: 'rectified',
  Verified: 'verified',
  Closed: 'closed',
  Rejected: 'rejected',
} as const;

export type WarrantyStatus =
  (typeof WarrantyStatus)[keyof typeof WarrantyStatus];

export const WarrantyCategory = {
  Waterproofing: 'waterproofing',
  Electrical: 'electrical',
  Plumbing: 'plumbing',
  Finishing: 'finishing',
  Other: 'other',
} as const;

export type WarrantyCategory =
  (typeof WarrantyCategory)[keyof typeof WarrantyCategory];

export type PublicCustomerWarranty = {
  id: string;
  ticketNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  category: WarrantyCategory;
  description: string;
  status: WarrantyStatus;
  raisedAt: string;
  closedAt: string | null;
  createdAt?: string;
};

export type CustomerWarrantyListRow = Pick<
  PublicCustomerWarranty,
  | 'id'
  | 'ticketNumber'
  | 'projectId'
  | 'customerId'
  | 'unitId'
  | 'category'
  | 'description'
  | 'status'
  | 'raisedAt'
  | 'closedAt'
  | 'createdAt'
>;

export type ListCustomerWarrantiesQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  bookingId?: string;
  customerId?: string;
  unitId?: string;
  status?: WarrantyStatus;
  category?: WarrantyCategory;
};

export type PaginatedCustomerWarranties = {
  items: CustomerWarrantyListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
