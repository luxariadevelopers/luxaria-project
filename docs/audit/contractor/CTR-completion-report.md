# Phase 6 – Contractor Management — Completion Report

**Date:** 2026-07-21  
**Principle:** Verified site execution feeds immutable contractor liabilities; approved commercial terms are never silently overwritten.

## Verdict

**PASS** — Waves W1–W9 delivered, parent-wired, and pending close-out items completed (material recon → RA `materialRecovery`, agreement rate-contract snapshot on activate, mobile WO list + measurement acknowledge).

## Delivered

| Wave | Capability | Result |
|------|------------|--------|
| W1 | Contractor master gaps | Contacts/addresses, insurance expiry, suspend/blacklist/reactivate + audit, doc verify, compliance expiring |
| W2 | Tenders | Invite → bid → compare → recommend → award |
| W3 | Rate contracts | Company/project SOR; activate / supersede / terminate |
| W4 | Work orders + amendments | Full lifecycle; append-only commercial revisions; mobile list |
| W5 | Measurement book | L×B×H / formula; WO/DPR links; revise not silent edit |
| W6 | RA bill calculation + PC | Full payable formula; aliases; `partially_paid`/`closed`; double-billing guards; `paymentCertificateNumber` |
| W7 | Recoveries + material reconcile | Issued − theoretical − wastage − returned; post-to-bill rolls `recoveryAmount` into RA `materialRecovery` |
| W8 | Retention + ledger UI | Staged release + register; contractor ledger page |
| W9 | Dashboard / reports + mobile polish | KPIs + registers; mobile WO list; engineer ack on measurements |

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Contractors onboarded / verified / compliance | ✅ |
| Rate contracts + work orders approved / issued | ✅ |
| Approved WO terms not silently modified | ✅ |
| DPR-linked MB recorded / certified | ✅ |
| RA bills from certified/verified measurements | ✅ |
| Previous certified qty not double-billed | ✅ |
| Retention / advances / recoveries / tax / GST | ✅ |
| Material reconcile with inventory path | ✅ (post-to-bill updates RA `materialRecovery`) |
| Agreement rate-contract snapshot at activate | ✅ (`rateContractId` + version + BOQ rates) |
| Payment certificate / payable post | ✅ |
| Contractor ledger reconciles | ✅ |
| Mobile WO list + measurement acknowledge | ✅ (ack online-only by design) |
| IAM / company / project / site isolation | ✅ |

## Deploy prerequisite (Phase 5)

Apply DPR site/shift unique index on every Mongo environment before relying on multi-site DPRs:

```bash
MONGODB_URI=... node scripts/migrations/se-dpr-site-shift-unique-index.mjs --dry-run
MONGODB_URI=... node scripts/migrations/se-dpr-site-shift-unique-index.mjs --apply
```

See `docs/audit/site-execution/SE-dpr-index-migration.md`.

## Close-out completed this pass

- Material reconciliation `postToBill` → additive RA `materialRecovery` via `ContractorBillsService`
- Agreement `rateContractId` / `rateContractVersion` snapshot on activate (`applyRateContractSnapshot`)
- Mobile: `WorkOrderListScreen` + Home tile; measurement list Acknowledge (`measurement.certify`)

## Remaining (optional roadmap)

- Offline enqueue for measurement acknowledge (SoD / queue polish)
- Playwright full contractor lifecycle E2E
- Customer Booking · Unit Sales · Collections → Accounting → Director BI
