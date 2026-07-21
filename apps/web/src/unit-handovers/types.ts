export const UnitHandoverStatus = {
  Draft: 'draft',
  Scheduled: 'scheduled',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export type UnitHandoverStatus =
  (typeof UnitHandoverStatus)[keyof typeof UnitHandoverStatus];

export type PublicUnitHandover = {
  id: string;
  handoverNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  status: UnitHandoverStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  keysHandedOver: boolean;
  customerAcknowledged: boolean;
  createdAt?: string;
};

export type UnitHandoverListRow = Pick<
  PublicUnitHandover,
  | 'id'
  | 'handoverNumber'
  | 'projectId'
  | 'customerId'
  | 'unitId'
  | 'status'
  | 'scheduledAt'
  | 'completedAt'
  | 'keysHandedOver'
  | 'customerAcknowledged'
  | 'createdAt'
>;

export type ListUnitHandoversQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  bookingId?: string;
  customerId?: string;
  unitId?: string;
  status?: UnitHandoverStatus;
};

export type PaginatedUnitHandovers = {
  items: UnitHandoverListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
