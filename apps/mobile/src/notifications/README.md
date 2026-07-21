# Mobile notifications

In-app inbox and entity deep links for the site app (Micro Phase 130).

## Nest APIs used

| Method | Path | Permission |
|---|---|---|
| GET | `/notifications` | `notification.view` |
| PATCH | `/notifications/:id/read` | `notification.view` |
| POST | `/notifications/read-all` | `notification.view` |

Push token registration is **not** available on Nest yet; `registerForPushNotificationsAsync` stays local-only.

## Deep links

`resolveNotificationDeepLink` maps `entityType` / `eventType` to existing mobile screens and checks permissions before open. Invalid entity ids, unknown entity types, and missing permissions are rejected (see `__tests__/resolveDeepLink.test.ts`).

| entityType | Screen | Permissions |
|---|---|---|
| `work_measurement` | `WorkMeasurementList` (no mobile detail screen) | `measurement.view` |
| `stock_count` | `StockCountEntry` if id else `StockCountList` | `stock.view` |
| `material_issue` | `MaterialReturn` if id else `MaterialIssue` | `stock.view` + `stock.issue` (detail) / `stock.view` (list) |
| `signed_payment_voucher` / `labour_voucher` | `LabourVoucherDetail` if id else `LabourVoucherHistory` | `payment.view` |
| `quality_inspection` | `QualityInspectionList` (no detail screen) | `quality.view` |

Event fallbacks: `missing_work_measurement` → `WorkMeasurementForm` (`measurement.create`); `stock_count_due` / `low_stock` → `StockCountEntry` (`stock.adjust`); `material_issue_requested` → `MaterialIssueForm` (`stock.issue`).

## Offline gaps (intentional)

- **Material issue create** — online-only. Mobile creates a draft and directs users to attach signatures on web; no offline enqueue until signature/photo capture exists on mobile.
- **Approvals** — online-only (no offline approval pattern).
- **Quality inspection complete** — online-only (inspect action on list; no JSON-only create queue).

Site expense and purchase request **create+submit** now queue offline (`site_expense.create`, `purchase_request.create`) when lookups were loaded online first.
