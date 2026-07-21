export const UnitRegistrationStatus = {
  Draft: 'draft',
  Submitted: 'submitted',
  Registered: 'registered',
  Cancelled: 'cancelled',
} as const;

export type UnitRegistrationStatus =
  (typeof UnitRegistrationStatus)[keyof typeof UnitRegistrationStatus];

export type PublicUnitRegistration = {
  id: string;
  registrationNumber: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  unitId: string;
  status: UnitRegistrationStatus;
  registrationDate: string | null;
  documentNumber: string | null;
  createdAt?: string;
};

export type UnitRegistrationListRow = Pick<
  PublicUnitRegistration,
  | 'id'
  | 'registrationNumber'
  | 'projectId'
  | 'customerId'
  | 'unitId'
  | 'status'
  | 'registrationDate'
  | 'documentNumber'
  | 'createdAt'
>;

export type ListUnitRegistrationsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  bookingId?: string;
  customerId?: string;
  unitId?: string;
  status?: UnitRegistrationStatus;
};

export type PaginatedUnitRegistrations = {
  items: UnitRegistrationListRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};
