# Material variance workspace (Micro Phase 085)

Web UI for **actual vs theoretical** material consumption at  
`/project-control/material-variance`.

## Nest APIs

| Method | Path | Permission |
|--------|------|------------|
| GET | `/material-consumption-reports/preview` | `material_consumption.view` |
| POST | `/material-consumption-reports` | `material_consumption.manage` |
| GET | `/material-consumption-reports` | `material_consumption.view` |
| GET | `/material-consumption-reports/:id` | `material_consumption.view` |
| PATCH | `/material-consumption-reports/:id` | `material_consumption.manage` |
| POST | `/material-consumption-reports/:id/submit` | `material_consumption.manage` |
| POST | `/material-consumption-reports/:id/approve` | `material_consumption.approve` |
| POST | `/material-consumption-reports/:id/cancel` | `material_consumption.manage` |

Authoritative doc: [`MATERIAL_CONSUMPTION_API.md`](../../../backend/docs/MATERIAL_CONSUMPTION_API.md).

Optional read-only report export:  
`GET /construction-reports/material-consumption-variance` (`report.view`).

## Permissions

Prompt alias `material_variance.*` **does not exist**. Mapping:

| UI action | Nest permission |
|-----------|-----------------|
| View / preview / list | `material_consumption.view` |
| Generate, explain, submit, cancel | `material_consumption.manage` |
| Approve with comment | `material_consumption.approve` |

## Validation (client ↔ Nest)

- **Submit**: every line with `requiresApproval` needs non-empty `explanation`  
  (mirrors `assertVarianceExplained`).
- **Approve**: when report `requiresApproval`, non-empty `approvalComment`  
  (mirrors `assertVarianceApprovalComment`).
- **Threshold**: default 5% (`MATERIAL_CONSUMPTION_VARIANCE_THRESHOLD_PERCENT`);  
  UI requires supporting evidence files when variance % ≥ threshold before submit.

## Module layout

| File | Role |
|------|------|
| `api.ts` | HTTP client |
| `hooks.ts` | React Query |
| `roleAccess.ts` | Capability helpers |
| `validation.ts` | Submit / approve / evidence gates |
| `VarianceTable.tsx` | Line grid with alerts |
| `ConsumptionWaterfall.tsx` | Expected vs actual bars |
| `ExplanationForm.tsx` | Corrective action text |
| `EvidencePanel.tsx` | File attachments (referenced in explanation) |
| `ApprovalActions.tsx` | Submit / approve / cancel |

## Security

1. `RegistryRouteGuard` + `material_consumption.view` on route.
2. Project scope via `ProjectRequiredRoute`.
3. Nest **403** → `PermissionDenied` / `RetryPanel` — hiding buttons is not enough.

## Tests

```bash
pnpm --filter @luxaria/web test:unit -- material-variance/validation
```
