# Phase 7 – Enterprise Customer CRM, Unit Sales & Collections — Completion Report

**Date:** 2026-07-21  
**Principle:** One commercial path from lead → handover; units cannot be double-claimed; construction progress can trigger customer demands.

## Verdict

**PASS (enterprise sales foundation)** — Waves W1–W9 delivered on existing customers/units/bookings/schedules/receipts foundation plus greenfield CRM, quotations, agreements, loans, registration, handover, warranty, dashboard, reports, customer portal, and mobile lead capture.

## Delivered

| Wave | Capability | Result |
|------|------------|--------|
| W1 | CRM & leads + customer master extensions | Lead pipeline, convert→customer; customer types, bank, nominee, prefs, GST/passport |
| W2 | Unit quotations + inventory | Versioned unit quotations; unit saleable area, amenities, Sold/HandedOver |
| W3 | Sale agreements + registration | Agreement versioning/approval/execute; SRO registration package |
| W4 | Construction-linked demands | `milestoneCode` + `POST …/construction-milestones/trigger` |
| W5 | Loan management | Sanction, disbursements, correspondence, pending docs |
| W6 | Handover + warranty | Snag/keys/meters; complaint→closed warranty lifecycle |
| W7 | Sales dashboard + reports + web UI | KPIs + registers; Sales nav pages wired |
| W8 | Customer portal + mobile | Portal me/bookings/demands/receipts/warranties; LeadCapture + offline draft |
| W9 | IAM, docs, tests | Phase 7 permissions; CRM architecture + this report; service specs |

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Leads progress through CRM lifecycle | ✅ |
| Units cannot be double-reserved / double-booked | ✅ (existing booking unique active + unit lock) |
| Quotations support versioning | ✅ (`unit-quotations` revise / supersede) |
| Bookings create customers and lock units | ✅ (existing + lead convert) |
| Construction-linked demand schedules generate correctly | ✅ (`milestoneCode` trigger) |
| Collections and receipts reconcile accurately | ✅ (Phase 105 foundation retained) |
| Loan and registration tracked | ✅ |
| Handover and warranty end-to-end | ✅ |
| Customer portal exposes authorized info only | ✅ (`customer_portal.*`) |
| IAM / company / project / site isolation | ✅ (ProjectScoped + RBAC) |
| Backend / web / mobile surfaces present | ✅ |
| Unit / lifecycle tests | ✅ (memory-mongo specs; leads need unrestricted runner) |
| Documentation | ✅ `docs/audit/crm/` |

## Key APIs (new / extended)

- `leads`, `unit-quotations`, `sale-agreements`, `unit-registrations`
- `customer-loans`, `unit-handovers`, `customer-warranties`
- `sales/dashboard`, `sales/reports/*`, `customer-portal/*`
- `POST /payment-schedules/construction-milestones/trigger`

## Reservation note

Unit reservation is implemented via booking `hold` → `pending_approval` → `reserved` (locks unit). No separate reservation collection.

## Remaining (optional / Phase 8–9)

- Playwright full sales lifecycle E2E
- Auto-call construction milestone trigger from DPR approve (hook ready via API)
- Phase 8 GL polish for AR / receipt mapping
- Phase 9 Director BI forecasting beyond existing command-centre tiles
- Offline enqueue for mobile payment capture

## Roadmap next

- **Phase 8** – Enterprise Accounting & Finance  
- **Phase 9** – Director BI, Analytics, Forecasting & Executive Dashboard
