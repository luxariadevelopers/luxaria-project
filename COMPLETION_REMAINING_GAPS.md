# Completion — remaining gaps (2026-07-22)

Final verify after the remaining-gaps wave. **Not** a “100% ERP done” certificate.

## Verdict

**ALL CORE GAPS CLOSED? yes**

Named P0/P1 explore-backlog items for this wave are **DONE**, including secondary workflow UIs (MB revise, tender record-bid, material-recon post-to-bill).

Phase **141** stays discovery-only (expected) — not core ERP debt.

## Scorecard (this wave)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Vendor ledger journal-backed (not placeholder) | **DONE** | Nest `GET /vendors/:id/ledger` wraps accounting-reports `vendor-ledger` (`vendors.service.ts` `getLedger`); web `VendorLedgerPanel` + `fetchVendorLedger`; deprecated `VendorLedgerPlaceholder` alias only |
| 2 | stock-reservations web UI | **DONE** | `apps/web/src/stock-reservations/*` (list, create, detail, release/cancel); route `/inventory/stock-reservations` → `StockReservationsPage` |
| 3 | warehouse-locations web UI | **DONE** | `apps/web/src/warehouse-locations/*` (list, form create/edit); route `/inventory/warehouse-locations` → `WarehouseLocationsPage` |
| 4 | Work orders full UI (not stub) | **DONE** | List + detail: create/edit drawer, submit/approve/issue/accept/start/complete/close, amend/reject/cancel (`WorkOrdersPage`, `WorkOrderDetailPage`, `work-orders/*`) |
| 5 | Contractor recoveries page/routes | **DONE** | Routes `contractor-recoveries` + detail; `ContractorRecoveriesPage` / `ContractorRecoveryDetailPage`; create + approve/post workflow |
| 6 | Playwright hard `test.skip(true)` removed for procurement + petty-cash UI golden paths | **DONE** | `golden-path-procurement.spec.ts` / `golden-path-petty-cash.spec.ts` have live UI journeys; only intentional hard skip: `project-creation.spec.ts` AC-6 duplicate-code (`test.skip(true, duplicateCodeSkipReason)`). Other skips are env/seed guards |
| 7 | Finance dashboard bank-recon KPI `available: true` | **DONE** | `finance-dashboard.service.ts` `bankReconciliationPending` returns `available: true` (empty and populated paths); covered in `finance-dashboard.service.spec.ts` |
| 8 | Site issues/diary/equipment create/edit | **DONE** | `SiteIssueFormDrawer`, `SiteDiaryFormDrawer`, `EquipmentFormDrawer` with create/edit modes on their pages |
| 9 | Site quality/safety create/edit | **DONE** | `SiteQualityFormDrawer`, `SiteSafetyFormDrawer` create/edit on `SiteQualityPage` / `SiteSafetyPage` |
| 10 | Stock transfers create+post | **DONE** | `StockTransfersPage` + `CreateStockTransferDrawer` + `postStockTransfer` |
| 11 | Measurement book create+workflow | **DONE** | Create drawer + submit/acknowledge/verify/certify/reject/cancel (`MeasurementBookPage`, `workflowActions.ts`) |
| 12 | Tender create+invite | **DONE** | `TenderCreateDrawer` + `TenderInviteDialog` on `TenderListPage`; compare/recommend/award on `BidComparisonPage` |
| 13 | Material reconciliation create+approve | **DONE** | `MaterialReconciliationFormDrawer` + approve action on `MaterialReconciliationPage` |
| 14 | `docs/ui-api-matrix.md` no longer says domain modules Missing | **DONE** | Frontend capability map uses Present/Done; refresh note supersedes old “domain modules Missing”. Inventory/E2E stale lines updated in this verify |
| 15 | `COMPLETION_REMAINING_GAPS.md` exists | **DONE** | This file |

## Secondary workflow actions (closed after verify)

| Action | Status | Notes |
|--------|--------|-------|
| Measurement book **revise** UI | **DONE** | `ReviseMbDialog` on `MeasurementBookPage` → `POST …/revise` |
| Tender **record-bid** UI | **DONE** | `TenderRecordBidDialog` on `TenderListPage` → `POST …/bids` |
| Material recon **post-to-bill** UI | **DONE** | `PostToBillDialog` + running-bill picker on `MaterialReconciliationPage` |

## Checks

| Check | Result |
|-------|--------|
| Conflict markers in recently touched areas | None (`<<<<<<` / `======` / `>>>>>>`) |
| `rg "test.skip\\(true" apps/web/e2e` | Only `project-creation.spec.ts` AC-6 (intentional) |
| Phase 141 | Discovery-only — see below |

## Just completed earlier — site mobile gaps

Wave closed incomplete site-mobile phases **118 / 120 / 121 / 122 / 124 / 125**:

| Phase | Feature | Evidence |
|------|---------|----------|
| 118 | Expense list + local drafts | `COMPLETION_SITE_MOBILE_GAPS.md`, `apps/mobile/src/site-expenses/` |
| 120 | Expense signatures | Mobile capture + web `SignaturesPanel` when editable |
| 121 | Petty-cash balance + request home | `PettyCashHomeScreen`, `BalanceCard` |
| 122 | Cash transfer acknowledge | `petty-cash-transfers/*` |
| 124 | Individual worker attendance | `IndividualAttendanceSection` + payload builder |
| 125 | Material issue sign + submit | `uploadMaterialIssueSignature` + form submit path |

**Verdict:** Core **site** mobile workflows (phases ~117–131 + push 136) are done for product use. Details: [`COMPLETION_SITE_MOBILE_GAPS.md`](./COMPLETION_SITE_MOBILE_GAPS.md).

## Phase 141 — intentionally discovery-only

[`COMPLETION_141.md`](./COMPLETION_141.md) / [`docs/advanced-controls-roadmap.md`](./docs/advanced-controls-roadmap.md):

- **In scope for 141:** capability discovery, risk/cost matrix, pilot go/no-go — **documentation only**.
- **Out of scope unless product code already exists:** shipping OCR, WhatsApp Business delivery, BIM viewer, or AI write-paths as production features.
- Existing stubs (e.g. WhatsApp channel placeholder, push/email provider wiring from 135–136) count as **foundation**, not as “advanced controls complete.”

Do **not** treat Phase 141 as missing implementation debt for core ERP go-live.

## Accurate “done” boundaries

| Scope | Status |
|-------|--------|
| Site mobile core | **Done** (gap wave closed) |
| Remaining-gaps wave (P0/P1 scorecard + secondary actions) | **Done** |
| Web HQ modules (broad ERP) | **Present** — routes + API clients; polish/edge UIs may remain |
| Investor portal 132–134 | **Done** (per completion docs) |
| Email / push 135–136 | **Done** (providers env-gated; stubs when unset) |
| Observability / AWS runbook 139–140 | **Done** as docs + health UI (not full IaC) |
| E2E full UI click-through (procurement / petty cash) | **Done** for golden-path UI journeys (env/seed gated) |
| Inventory reservation / WH-location UIs | **Done** |
| OCR / WhatsApp product / BIM / AI | **Discovery-only (141)** — not core completion criteria |

For the live UI↔API map, use the refreshed **Frontend capability map** in [`docs/ui-api-matrix.md`](./docs/ui-api-matrix.md).
