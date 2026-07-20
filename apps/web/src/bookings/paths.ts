/** Canonical list URL (Micro Phase 101). */
export const BOOKINGS_LIST_PATH = '/sales/bookings';

export function bookingsListPath(query?: { id?: string }): string {
  if (query?.id) {
    return `${BOOKINGS_LIST_PATH}?id=${encodeURIComponent(query.id)}`;
  }
  return BOOKINGS_LIST_PATH;
}
