# Contractor Running Bills — CTR Integration (Phase 6 W6)

## Status

Implemented in-module. **No `app.module` / permissions catalog / web navigation changes.**  
Parent merge only needs shared status catalogs (`partially_paid`, `closed`) if packages are published separately.

## Calculation engine

Pure helper: `computeRunningBillPayable` / `computePeriodBillPayable` in `contractor-bills.calculation.ts`.

```
Gross Work Value
+ Approved Extras
+ Price Escalation
− Previous Certified Value
− Retention
− Advance Recovery
− Material / Equipment / Labour Recoveries
− Penalties
− TDS
− Other deductions
+ GST
= Net Payable
```

Period bills store **current** certified work in `currentCertifiedValue` and call the period helper with `previousCertifiedValue = 0` at the payable step (previous is tracked separately for RA cumulative).  
`computeBillAmounts` remains the service entry-point and delegates to the period helper (backward compatible when extras/escalation/equipment/labour/gst are 0).

Money is rounded to **2 decimal places** (paise) per component and result. Unit tests: `contractor-bills.calculation.spec.ts`.

## Status mapping (Phase 6 names ↔ persisted)

| Phase 6 / CTR name | Persisted `ContractorBillStatus` | Kind |
|--------------------|----------------------------------|------|
| `qs_certified` | `engineer_verified` | **Alias** (not stored separately) |
| `payment_certified` | `posted` | **Alias** when posted (PC issued) |
| `partially_paid` | `partially_paid` | **Additive** persisted status |
| `closed` | `closed` | **Additive** persisted status |
| (unchanged) | `pm_certified` / `finance_verified` / `director_approved` / `paid` | Existing lifecycle |

Helpers:

- `PHASE6_BILL_STATUS_ALIASES` / `resolvePersistedBillStatus`
- `toPhase6BillStatusAlias` → public field `statusAlias`

### Lifecycle (unchanged core + additive tails)

```
Draft → Claimed → Engineer Verified (≈ qs_certified)
  → PM Certified → Finance Verified → Director Approved
  → Posted (≈ payment_certified; optional paymentCertificateNumber)
  → Partially Paid (payment allocation with remaining > 0)
  → Paid → Closed
```

Reject / cancel paths unchanged. Posted+ bills remain immutable for commercial edits.

## Payment certificate

Optional `paymentCertificateNumber` on:

- `POST …/:id/director-approve` (`WorkflowNoteDto`)
- `POST …/:id/post` (`PostContractorBillDto`)

Stored uppercase; once set, empty updates do not clear it. Posting remains the AP recognition / payment-certificate gate (`status=posted`).

## Double-billing guards

1. **Measurement ID** — cannot appear on any non-rejected/cancelled bill (`MEASUREMENT_BLOCKING_BILL_STATUSES`). Certified bills return a clearer conflict message.
2. **BOQ quantity** — for each BOQ item: `priorCertifiedQty + Σ current on this bill` must equal `max(cumulativeQuantity)` among selected measurements. Blocks re-billing previously certified quantities even via a new measurement sheet.

## New schema fields

| Field | Notes |
|-------|--------|
| `approvedExtras` / `priceEscalation` | CTR additives |
| `equipmentRecovery` / `labourRecovery` | CTR recoveries (journal → Other Contractor Deduction) |
| `gst` | Added to net payable; journal Dr Input GST |
| `paymentCertificateNumber` | Optional PC number |
| `partially_paid` / `closed` | Additive statuses |

## Permissions (reuse — no catalog change)

Existing `running_bill.*` verbs. `POST …/:id/close` uses `running_bill.pay`.

## Web package

`apps/web/src/running-bills` types/API/validation updated for new amount fields, `statusAlias`, PC number, post/close helpers. No route registry / navigation edits.

## Parent follow-ups (optional)

1. Dedicated equipment / labour recovery GL categories (today: Other Contractor Deduction).
2. GST-TDS line if statutory rules require a separate withholding.
3. UI for extras / escalation / PC number entry on approve/post dialogs.
