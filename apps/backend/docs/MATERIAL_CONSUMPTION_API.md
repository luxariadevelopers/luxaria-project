# Material Consumption Reports API — Luxaria Developers ERP

Base path: `/api/v1/material-consumption-reports`  
Swagger tag: **Material Consumption**

Actual-versus-theoretical material consumption reporting for a project (optionally period-filtered).

## Permissions

| Permission | Usage |
|------------|--------|
| `material_consumption.view` | Preview, list, get |
| `material_consumption.manage` | Generate, update explanations, submit, cancel |
| `material_consumption.approve` | Approve submitted reports with variance |

## Numbering

`NumberEntityType.MATERIAL_CONSUMPTION_REPORT` → `MCR-YYYY-######` (FY + project-scoped).

## Formulas (per BOQ item × material)

| Metric | Formula |
|--------|---------|
| Work quantity completed | Σ `currentQuantity` of submitted/verified work measurements |
| Standard material requirement | work qty × coefficient |
| Allowed wastage | requirement × (wastage% / 100) |
| Expected consumption | requirement + allowed wastage |
| Actual material issued | Σ confirmed issue `baseUnitQuantity` |
| Material returned | Σ issue item `returnedBaseQuantity` |
| Net actual consumption | issued − returned |
| Variance quantity | net actual − expected |
| Variance percentage | \|variance\| / expected × 100 (100% if expected = 0 and actual ≠ 0) |
| Variance value | variance qty × material `standardRate` |

### Standard source (priority)

1. Active **material consumption standard** (project override, then global) for BOQ + material  
2. Else BOQ item `materialCoefficients` + material `standardWastagePercentage`  
3. Else coefficient `0` (issue-only lines)

## Alerts

| Alert | When |
|-------|------|
| `above_allowed_variance` | Net actual > expected (beyond wastage band) |
| `negative_consumption` | Net actual < 0 |
| `material_issue_without_progress` | Issued > 0 and work qty = 0 |
| `progress_without_material_issue` | Work qty > 0, material required, issued = 0 |
| `unexplained_stock_shortage` | Open stock count shortage for material with no reason |

## Variance explanation & approval

1. Lines with variance / negative consumption / unexplained shortage (or % ≥ threshold) set `requiresApproval`.
2. **Submit** requires a non-empty `explanation` on every such line.
3. **Approve** requires `material_consumption.approve` and a non-empty `approvalComment` when the report `requiresApproval`.

## Workflow

```
Draft → Submitted → Approved
         ↘ Cancelled
```

Cancel is allowed before approval.

## Endpoints

| Method | Path |
|--------|------|
| `GET` | `/material-consumption-reports/preview` |
| `POST` | `/material-consumption-reports` |
| `GET` | `/material-consumption-reports` |
| `GET` | `/material-consumption-reports/:id` |
| `PATCH` | `/material-consumption-reports/:id` |
| `POST` | `/material-consumption-reports/:id/submit` |
| `POST` | `/material-consumption-reports/:id/approve` |
| `POST` | `/material-consumption-reports/:id/cancel` |

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `MATERIAL_CONSUMPTION_VARIANCE_THRESHOLD_PERCENT` | `5` | Absolute variance % of expected that escalates approval |
