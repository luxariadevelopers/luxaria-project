# Units API — Luxaria Developers ERP

Base path: `/api/v1/units`  
Swagger tag: **Units**

Real-estate unit inventory for sales projects.

## Permissions

| Permission | Usage |
|------------|--------|
| `unit.view` | List, get |
| `unit.manage` | Create, update, status change, delete |

## Fields

| Field | Notes |
|-------|--------|
| `projectId` | Project |
| `block` | Block label (normalized uppercase) |
| `floor` | Floor label |
| `unitNumber` | Unit number within block |
| `unitType` | `studio` / `1bhk` / `2bhk` / … / `plot` / `other` |
| `carpetArea` / `builtUpArea` / `uds` | Areas |
| `facing` | Optional facing enum |
| `parking` | Free-text parking allotment |
| `basePrice` / `additionalCharges` / `tax` | Pricing |
| `totalPrice` | Computed sum (read-only) |
| `status` | Inventory status |

## Statuses

`available` → `held` → `reserved` → `booked` → `agreement_executed` → `registered`

Also: `cancelled`, `blocked` (releasable back to `available`).

## Rules

1. **Unique unit number** — active `(projectId, block, unitNumber)` is unique (soft-delete aware).
2. **No double booking** — hold / reserve / book use atomic `findOneAndUpdate` on allowed prior statuses; concurrent claims return `409 Conflict`.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/units` |
| `GET` | `/units` |
| `GET` | `/units/:id` |
| `PATCH` | `/units/:id` |
| `POST` | `/units/:id/status` |
| `DELETE` | `/units/:id` |
