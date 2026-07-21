/**
 * Portal paths for bookings (list = Phase 101; create/detail = write workflows).
 */
export const BOOKING_ROUTES = {
  list: '/sales/bookings',
  create: '/sales/bookings/new',
  detail: (id: string) =>
    `/sales/bookings/${encodeURIComponent(id)}`,
} as const;
