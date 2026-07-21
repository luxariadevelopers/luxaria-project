# Phase 7 CRM / Sales — Integration Notes

## Upstream

| System | Integration |
|--------|-------------|
| Phase 2 Projects / Units | `projectId`, unit block/floor/number hierarchy |
| Phase 5 Site Execution | Call `POST /payment-schedules/construction-milestones/trigger` with certified `milestoneCode` |
| Approvals | Sale agreements + payment schedules reuse approval engine |
| Notifications | Existing notification module for demands/receipts (extend as needed) |
| Phase 8 Accounting | Customer receipts already post journals; AR polish in Phase 8 |

## Downstream consumers

| Consumer | Reads |
|----------|-------|
| Director command centre | Collections / overdue tiles (existing) + sales dashboard |
| Customer portal | Bookings, demands, receipts, agreements, warranties |
| Mobile sales | Lead capture (`lead.manage`) |

## Reservation vs booking

Reservation = booking statuses `hold` | `pending_approval` | `reserved`. Unit status mirrors. Double-book prevented by unique active booking per unit.
