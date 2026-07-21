# Phase 6 – Contractor Management Current State Inventory

**Date:** 2026-07-21  
**Baseline:** post–Phase 5 site execution (`SE-completion-report.md`)  
**Prerequisite:** DPR index migration (`SE-dpr-index-migration.md`) applied on every Mongo environment

## Existing modules (keep / extend)

| Capability | Module | Status |
|------------|--------|--------|
| Contractor master | `contractors` | Strong — type, PAN/GST, bank, docs, verify, project assign, block/inactive, performance rollup |
| Commercial instrument | `contractor-agreements` | Strong rate/agreement versioning + retention % + advance recovery plan; **acts as rate contract today** |
| Work measurements | `work-measurements` | MB-like sheets; DPR/site/drawing links; verify → certify; **RA bills use verified** |
| Running bills (RA) | `contractor-bills` | Multi-stage RA + recoveries/retention/TDS + AP post |
| Contractor payments | `contractor-payments` | Allocations, release, post |
| Contractor ledger | `accounting-reports` type `contractor-ledger` | Journal party ledger report — not first-class SE UI |
| Material issues to contractor | `material-issues` | `issueTo: contractor` — **manual** bill `materialRecovery` |
| Approvals engine | `approvals` | Reuse for WO / tender / retention release |

## Explicit gaps vs Phase 6 scope

1. Tender / bid comparison / award workflow  
2. Standalone rate-contract entity (company-wide + project) distinct from agreement if product requires both  
3. Work order lifecycle + amendments (immutable commercial revisions)  
4. Formal Measurement Book register (beyond WM sheets)  
5. RA status alignment to QS / payment certificate naming  
6. Retention **release** stages + register UI  
7. Automated material reconciliation (issue − theoretical − wastage − return = recovery)  
8. Dedicated contractor sub-ledger UI + debit/credit notes  
9. Contractor performance scoring suite  
10. Web routes: compliance, tenders, WO, MB, reconciliation, retention register, dashboard/reports  
11. Mobile: WO progress, measurements ack, RA tracking (offline-safe)

## Security baseline

Reuse IAM + company isolation + R-003 project/site + approvals + audit.  
Extend catalog with `tender.*`, `rate_contract.*`, `work_order.*`, `contractor_recovery.*`, `contractor_retention.*`, `contractor_payment_certificate.*`, `contractor_report.*`, `contractor_portal.*` only where no existing verb fits.  
**Reuse** `contractor.*`, `measurement.*`, `running_bill.*`, `payment.*` — no parallel system.

## Recommended waves

| Wave | Focus |
|------|--------|
| **W1** | Contractor master gaps (compliance expiry, blacklist/reactivate, contacts) |
| **W2** | Tender + bid comparison + award |
| **W3** | Rate contracts (or agreement promotion to company-wide) |
| **W4** | Work orders + amendments |
| **W5** | Measurement Book formalization + WO/DPR links |
| **W6** | Running bill calculation completeness + payment certificate |
| **W7** | Recoveries + material reconciliation |
| **W8** | Retention release + contractor ledger UI |
| **W9** | Performance, dashboard, reports, mobile |
