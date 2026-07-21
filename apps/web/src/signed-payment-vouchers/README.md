# Signed payment vouchers (web)

Labour signed payment vouchers — back-office review for vouchers captured on mobile.

## Route choice

**Path:** `/contractors/signed-vouchers`  
**Nav group:** `contractors`

Labour vouchers belong with contractor payments and attendance. There is no `payroll` nav group; `project-control` is BOQ/DPR focused.

## Nest API

Base: `/signed-payment-vouchers`

| Action | Method | Permission |
|--------|--------|------------|
| List / detail | GET | `payment.view` |
| Approve | POST `/:id/approve` | `payment.approve` |
| Post | POST `/:id/post` | `payment.approve` |
| Reverse | POST `/:id/reverse` | `payment.approve` |
| Cancel | POST `/:id/cancel` | `payment.release` |

List filter: `voucherType=labour` + `projectId`.

Mobile reference: `apps/mobile/src/labour-vouchers/`.

## Wiring (manual)

Add to `routeRegistry.ts`, `routeElements.tsx`, and `routes/index.tsx` — see parent task wiring instructions.
