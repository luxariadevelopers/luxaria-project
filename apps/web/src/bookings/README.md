# Bookings (Micro Phase 101)

Sales list for holds, reservations and bookings at `/sales/bookings`.

## Nest APIs used

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/bookings` | `booking.view` |
| `GET` | `/bookings/:id` | `booking.view` (detail hook; list phase) |

List query params (Nest `ListBookingsQueryDto`): `page`, `limit`, `search`, `status`, `projectId`, `unitId`, `customerId`, `sortOrder`.

Status values (Nest `BookingStatus`): `hold`, `pending_approval`, `reserved`, `booked`, `agreement`, `registered`, `expired`, `cancelled`.

Related label lookups (optional, existing endpoints):

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/units?projectId=` | `unit.view` |
| `GET` | `/customers/:id` | `customer.view` |

## Permissions

- `booking.view` — open list
- `booking.create` / `booking.approve` — capability flags for later phases (wizard / discount)

## UI

- `BookingTable` — unit, customer, amounts, funding, status, hold expiry
- Hold expiry highlighting via `describeHoldExpiry` (expired / lapsed / invalid)
