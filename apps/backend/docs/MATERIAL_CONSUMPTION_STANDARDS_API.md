# Material Consumption Standards API — Luxaria Developers ERP

Base path: `/api/v1/material-consumption-standards`  
Swagger tag: **Material Consumption Standards**

## Example

| Field | Value |
|-------|--------|
| Work type | Brick masonry |
| Output unit | Square Foot |
| Material | Brick |
| Standard consumption | 8 bricks / sqft |
| Allowed wastage | 5% |
| Effective qty (with wastage) | 8.4 |

## Fields

| Field | Notes |
|-------|--------|
| `boqItemId` **or** `workType` | One required |
| `outputUnit` | BOQ unit (e.g. `square_foot`) |
| `materialId` | Active material |
| `quantityPerUnit` | Standard consumption per 1 output unit |
| `wastagePercentage` | 0–100 |
| `effectiveDate` | When the standard applies |
| `version` | Auto-incremented per scope |
| `status` | See workflow |
| `projectId` | Omit/null = company-wide; set = project override |

## Workflow (approval required)

```
Draft → PendingApproval → Active
                      ↘ Rejected → Draft (edit) → …
Active → (create version) → Draft → … → Active (prior becomes Superseded)
```

Approval requires `approvalReference`. Activating supersedes the previous active version for the same scope.

## Versioning

Standards are versioned by **scope key**:

- Global: `g|wt:brick masonry|mat:{id}|square_foot` (or `boq:{id}`)
- Project: `p:{projectId}|…`

One open draft/pending and one active version per scope.

## Project-specific override

Create with `projectId` set. Resolve prefers project active over company-wide active.

## Permissions

| Permission | Usage |
|------------|--------|
| `material_consumption.view` | List / get / resolve |
| `material_consumption.manage` | Create, update, version, submit |
| `material_consumption.approve` | Approve, reject |

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/material-consumption-standards` |
| `GET` | `/material-consumption-standards` |
| `GET` | `/material-consumption-standards/resolve` |
| `GET` | `/material-consumption-standards/:id` |
| `PATCH` | `/material-consumption-standards/:id` |
| `POST` | `/material-consumption-standards/:id/versions` |
| `POST` | `/material-consumption-standards/:id/submit` |
| `POST` | `/material-consumption-standards/:id/approve` |
| `POST` | `/material-consumption-standards/:id/reject` |

## Numbering

`MCS-YYYY-######` (company-wide sequence)
