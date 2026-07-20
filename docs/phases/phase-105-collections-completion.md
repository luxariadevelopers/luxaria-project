# Micro Phase 105 — Customer receipts / Collections (web)

**Branch:** `phase/105-customer-receipts-collections`  
**Worktree:** `~/.cursor/worktrees/phase105-71c0dfd5/…`  
**Date:** 2026-07-20

## Objective

Record and allocate customer receipts on web: create drafts, allocate payment demands (remainder = unallocated advance), post to journal + PDF, prevent duplicate bank transaction references.

## Delivered

| Area | Detail |
|---|---|
| Page | `/sales/collections` (`CollectionsPage`) |
| Module | `apps/web/src/customer-receipts/` |
| Components | `ReceiptForm`, `DemandAllocationPanel`, `BankSourceFields`, `ProofPanel`, `ReceiptTable`, `ReceiptFilters` |
| APIs (Nest only) | `GET/POST /customer-receipts`, `GET :id`, `POST :id/post`, `POST :id/cancel`, `POST :id/regenerate-pdf` |
| Supporting reads | `GET /payment-schedules?bookingId&status=active` (demand lines), `GET /company-bank-accounts` (`bank.view`), `GET /bookings` (`booking.view`) |
| Permissions | Nest catalog: `collection.view` / `collection.create` / `collection.approve` (post). No `customer_receipt.*` or verify route. |
| Nav | Sidebar **Sales > Collections** |
| Validation | Client mirrors Nest allocation totals + bank/txn rules; 409 duplicate txn surfaced clearly |
| Tests | `allocation.test.ts` (unallocated advance + over-allocation), `validation.test.ts` (duplicate ref message + schema), `roleAccess.test.ts` |
| Matrix | `docs/ui-api-matrix.md` updated for web UI row |

## Acceptance

- Collections can be listed/created under Sales.
- Allocations cannot exceed receipt amount; remainder is unallocated advance.
- Duplicate transaction reference per company bank account is rejected (Nest 409) and shown in UI.
- Posting (`collection.approve`) allocates demands, creates journal, generates PDF path.

## Merge / cleanup

- Merge back: `/apply-worktree`
- Cleanup: `/delete-worktree`
