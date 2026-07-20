# Micro Phase 128 — Labour vouchers (mobile) completion

**Status:** Complete (mobile only)  
**Branch / worktree:** `micro-phase-128-labour-vouchers`  
**Backend surface used:** `signed-payment-vouchers` (existing Nest)

## Delivered

- **Screens:** New Labour Voucher, history list, detail (PDF when approved)
- **Nav:** Home → Labour Voucher (`LabourVoucherHistory`)
- **Components:** recipient/gang, work, attendance/quantity + rate, deductions, net summary, petty-cash payment mode, signature/photo capture, async loading/empty/error/403/retry
- **Validation:** client net reconciliation (`gross − deductions`); signatures required per voucher configuration (and Nest submit rules)
- **Permissions (Nest catalog):** `payment.view`, `payment.release` (spec aliases `labour_voucher.create/submit`), plus `cash.view` / `document.upload` / `document.download` for supporting calls
- **Tests:** calculation + validation unit tests under `apps/mobile/src/labour-vouchers/__tests__/`
- **Docs:** `docs/ui-api-matrix.md` mobile capability map updated

## API mapping (no invented paths)

| Action | Method / path | Permission |
|---|---|---|
| List / get | `GET /signed-payment-vouchers`, `GET /:id` | `payment.view` |
| Create draft | `POST /signed-payment-vouchers` | `payment.release` |
| Attach signatures | `POST /:id/signatures` | `payment.release` |
| Submit | `POST /:id/submit` | `payment.release` |
| PDF | Generated on approve; open via `GET /documents/:id/download-url` | `document.download` |

## Acceptance

A numbered labour voucher draft can be created, signatures/photos attached per configuration, and submitted (`draft` → `submitted`). PDF opens after approval when `voucherPdfDocumentId` is present.

## Verification

- `pnpm --filter @luxaria/mobile typecheck` — pass
- `pnpm --filter @luxaria/mobile lint` — pass
- `pnpm --filter @luxaria/mobile test` (mobile-logic, includes labour-voucher calculation/validation tests) — pass

## Notes

- Attendance/quantity and rate are mobile UI inputs that derive Nest `grossAmount`; Nest does not store quantity/rate separately.
- Payment mode is petty cash only (`pettyCashAccountId`); Nest has no alternate payment-mode enum on this module.
