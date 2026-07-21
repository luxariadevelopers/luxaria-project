# Phase 7 – Enterprise Customer CRM, Unit Sales & Collections — Architecture

**Date:** 2026-07-21  
**Principle:** One commercial path from lead → handover; units cannot be double-claimed; construction progress can trigger customer demands.

## Lifecycle

```text
Lead → Enquiry/Contact → Site Visit → Quotation → Negotiation
  → Unit Reservation (booking hold/reserved) → Booking → Sale Agreement
  → Construction-linked Demand Schedule → Collections / Receipts
  → Loan (optional) → Registration → Handover → Warranty / Defects
```

## Module map

| Capability | Module | Notes |
|------------|--------|-------|
| CRM / Leads | `leads` | Sources, pipeline, follow-ups, convert → customer |
| Customer master | `customers` | Types, KYC, bank, nominee, prefs |
| Unit inventory | `units` | Project → block → floor → unit; sale statuses |
| Unit quotations | `unit-quotations` | Versioned price breakup (PLC, GST, etc.) |
| Reservation | `bookings` (`hold` / `reserved`) | Locks unit; no separate reservation entity |
| Booking | `bookings` | Unique active booking per unit |
| Sale agreement | `sale-agreements` | Versioning, stamp paper, clauses, approval |
| Demand schedule | `payment-schedules` | `construction_milestone` + `milestoneCode` |
| Collections / receipts | `customer-receipts` | Allocations → journal |
| Loans | `customer-loans` | Sanction, disbursements, correspondence |
| Registration | `unit-registrations` | SRO, stamp duty, documents |
| Handover | `unit-handovers` | Snags, keys, meters, acknowledgement |
| Warranty | `customer-warranties` | Complaint → closed lifecycle |
| Sales dashboard | `sales-dashboard` | Pipeline + collection KPIs |
| Sales reports | `sales-reports` | Registers + funnel |
| Customer portal | `customer-portal` | Buyer-facing reads + warranty raise |

## Construction → Demand bridge

`POST /payment-schedules/construction-milestones/trigger` with `milestoneCode`:

`booking` · `foundation` · `basement` · `floor_complete` · `roof` · `brickwork` · `plastering` · `finishing` · `possession` · `registration`

Matches active `construction_milestone` schedule lines by `milestoneCode`, marks due, issues demands. Phase 5 site execution (approved DPR / certified progress) calls this after milestone certification.

## Security

Reuses IAM/RBAC, company isolation, project assignment, approval engine, audit logs.

Permission families: `crm.*` `lead.*` `quotation.*` `reservation.*` `booking.*` `agreement.*` `demand.*` `collection.*` `receipt.*` `loan.*` `registration.*` `handover.*` `warranty.*` `customer_portal.*` `sales_report.*` (plus existing `unit.*` `customer.*`).

## Integrations

- Phase 2 project hierarchy via `projectId` / unit block-floor
- Phase 5 site execution via construction milestone trigger
- Phase 8 accounting via customer-receipt journal posting (existing)
- Notifications / approvals reused where booking/schedule already wired
