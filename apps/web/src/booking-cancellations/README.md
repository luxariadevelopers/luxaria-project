# Booking cancellations & refunds (Micro Phase 106)

Web UI for Nest `booking-cancellations`.

## Route

- `/sales/cancellations` — Sales → Cancellations & Refunds
- Guard: `booking.view` + project required

## Nest permissions (catalog)

| UI capability | Nest code |
|---|---|
| View / list | `booking.view` |
| Request, review, submit approval, release unit, documents | `booking.cancel` |
| Approve / reject | `booking.approve` |
| Process refund (posts journal) | `collection.refund` |
| Bank account selector | `bank.view` |

## Workflow

Requested → Reviewed → (Pending approval) → Approved → Refund processed → Unit released

Unit is released only after approval, and after refund when `approvedRefund > 0`.
