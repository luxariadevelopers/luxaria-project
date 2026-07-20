/**
 * Mirrors `apps/backend/src/modules/units` public shapes.
 * Nest permissions: `unit.view` / `unit.manage`
 * (prompt aliases `unit.create` / `unit.update` / `unit.block` are not in the catalog).
 */

export const UnitStatus = {
  Available: 'available',
  Held: 'held',
  Reserved: 'reserved',
  Booked: 'booked',
  AgreementExecuted: 'agreement_executed',
  Registered: 'registered',
  Cancelled: 'cancelled',
  Blocked: 'blocked',
} as const;

export type UnitStatus = (typeof UnitStatus)[keyof typeof UnitStatus];

export const UnitType = {
  Studio: 'studio',
  OneBhk: '1bhk',
  TwoBhk: '2bhk',
  ThreeBhk: '3bhk',
  FourBhk: '4bhk',
  Penthouse: 'penthouse',
  Villa: 'villa',
  Shop: 'shop',
  Office: 'office',
  Plot: 'plot',
  Other: 'other',
} as const;

export type UnitType = (typeof UnitType)[keyof typeof UnitType];

export const UnitFacing = {
  North: 'north',
  South: 'south',
  East: 'east',
  West: 'west',
  NorthEast: 'north_east',
  NorthWest: 'north_west',
  SouthEast: 'south_east',
  SouthWest: 'south_west',
  Other: 'other',
} as const;

export type UnitFacing = (typeof UnitFacing)[keyof typeof UnitFacing];

export type PublicUnit = {
  id: string;
  projectId: string;
  block: string;
  floor: string;
  unitNumber: string;
  unitType: UnitType;
  carpetArea: number;
  builtUpArea: number;
  uds: number;
  facing: UnitFacing | null;
  parking: string | null;
  basePrice: number;
  additionalCharges: number;
  tax: number;
  totalPrice: number;
  status: UnitStatus;
  bookingRefId: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListUnitsQuery = {
  page?: number;
  limit?: number;
  projectId?: string;
  block?: string;
  floor?: string;
  status?: UnitStatus;
  unitType?: UnitType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedUnits = {
  items: PublicUnit[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null;
};

export type CreateUnitInput = {
  projectId: string;
  block: string;
  floor: string;
  unitNumber: string;
  unitType: UnitType;
  carpetArea: number;
  builtUpArea: number;
  uds: number;
  facing?: UnitFacing | null;
  parking?: string | null;
  basePrice: number;
  additionalCharges?: number;
  tax?: number;
  status?: UnitStatus;
  notes?: string | null;
};

export type UpdateUnitInput = {
  block?: string;
  floor?: string;
  unitNumber?: string;
  unitType?: UnitType;
  carpetArea?: number;
  builtUpArea?: number;
  uds?: number;
  facing?: UnitFacing | null;
  parking?: string | null;
  basePrice?: number;
  additionalCharges?: number;
  tax?: number;
  notes?: string | null;
};

export type ChangeUnitStatusInput = {
  status: UnitStatus;
  bookingRefId?: string | null;
  notes?: string | null;
};

/** Subset of Nest `PublicBooking` used for linked booking context. */
export type LinkedBooking = {
  id: string;
  bookingNumber: string;
  customerId: string;
  projectId: string;
  unitId: string;
  bookingDate: string;
  bookingAmount: number;
  agreedPrice: number;
  discount: number;
  approvedPrice: number;
  status: string;
  holdExpiresAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  cancellationReason: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Nest `ACTIVE_BOOKING_STATUSES` — claims a unit and blocks another active booking.
 * `apps/backend/src/modules/bookings/schemas/booking.schema.ts`
 */
export const ACTIVE_BOOKING_STATUSES = [
  'hold',
  'pending_approval',
  'reserved',
  'booked',
  'agreement',
  'registered',
] as const;

export type ActiveBookingStatus = (typeof ACTIVE_BOOKING_STATUSES)[number];
