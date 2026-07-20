# BOQ Version Control — Luxaria Developers ERP

Extends [`BOQ_API.md`](./BOQ_API.md).

## Version types

| Type | Code | Notes |
|------|------|--------|
| Original | `original` | First version for a project |
| Revision | `revision` | Snapshot from an approved version |
| Variation | `variation` | **Must** be approved before activation |
| Change Order | `change_order` | Snapshot from an approved version |

## Fields

`versionNumber`, `projectId`, `versionType`, `effectiveDate`, `reason`, `costImpact`, `timeImpact`, `approvalReference`, `status`

## Status workflow

```
Draft → Pending Approval → Active
                ↘ Rejected → (edit) → Pending Approval → Active
Active → Superseded (when a newer version is activated)
```

## Rules

1. **Approved versions are immutable** — `pending_approval`, `active`, and `superseded` cannot edit items or version metadata.
2. **Only one active BOQ version** per project (unique partial index).
3. **Comparison** — `GET …/versions/compare?fromVersionId=&toVersionId=` returns added / removed / changed items and cost impact.
4. **Variation requires approval** — cannot use `/activate`; must `/submit` then `/approve` with `approvalReference`.
5. Creating Revision / Variation / Change Order clones items from the based-on version.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/boq/projects/:projectId/versions` |
| `GET` | `/boq/projects/:projectId/versions` |
| `GET` | `/boq/projects/:projectId/versions/active` |
| `GET` | `/boq/projects/:projectId/versions/compare` |
| `GET` | `/boq/versions/:id` |
| `PATCH` | `/boq/versions/:id` |
| `POST` | `/boq/versions/:id/submit` |
| `POST` | `/boq/versions/:id/approve` |
| `POST` | `/boq/versions/:id/reject` |
| `POST` | `/boq/versions/:id/activate` |

## Permissions

| Permission | Usage |
|------------|--------|
| `boq.view` | List/get/compare versions |
| `boq.manage` | Create/update/submit/activate (non-variation) |
| `boq.approve` | Approve / reject |
