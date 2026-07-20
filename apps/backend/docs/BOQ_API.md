# BOQ API — Luxaria Developers ERP

Base path: `/api/v1/boq`  
Swagger tag: **BOQ**

## Hierarchy

```
Project
 → Block
   → Floor
     → Work Category
       → BOQ Item
```

## Permissions

| Permission | Usage |
|------------|--------|
| `boq.view` | List/get hierarchy & items, export, validate totals, template |
| `boq.manage` | Create/update hierarchy & items, Excel import |

## Numbering

| Field | Meaning |
|-------|---------|
| `boqCode` | Manual or auto `BOQ-YYYY-######` (project-scoped) |

## BOQ item fields

`boqCode`, `description`, `unit`, `plannedQuantity`, `materialCost`, `labourCost`, `subcontractCost`, `otherCost`, `plannedRate`, `plannedValue`, `startDate`, `endDate`, `materialCoefficients`, `status`

### Totals rules

- `plannedRate` = `materialCost + labourCost + subcontractCost + otherCost`
- `plannedValue` = `plannedQuantity × plannedRate`

Omitted rate/value are computed automatically; provided values are validated.

## Endpoints

### Hierarchy

| Method | Path |
|--------|------|
| `POST` | `/boq/projects/:projectId/blocks` |
| `GET` | `/boq/projects/:projectId/blocks` |
| `PATCH` | `/boq/blocks/:id` |
| `POST` | `/boq/blocks/:blockId/floors` |
| `GET` | `/boq/blocks/:blockId/floors` |
| `PATCH` | `/boq/floors/:id` |
| `POST` | `/boq/floors/:floorId/work-categories` |
| `GET` | `/boq/floors/:floorId/work-categories` |
| `PATCH` | `/boq/work-categories/:id` |
| `GET` | `/boq/projects/:projectId/hierarchy` |

### Items

| Method | Path |
|--------|------|
| `POST` | `/boq/projects/:projectId/items` |
| `GET` | `/boq/projects/:projectId/items` |
| `GET` | `/boq/items/:id` |
| `PATCH` | `/boq/items/:id` |
| `POST` | `/boq/projects/:projectId/validate-totals` |

### Excel

| Method | Path |
|--------|------|
| `GET` | `/boq/import-template` |
| `POST` | `/boq/projects/:projectId/import` (multipart `file`) |
| `GET` | `/boq/projects/:projectId/export` |

### Excel columns

`blockCode`, `blockName`, `floorCode`, `floorName`, `floorLevel`, `categoryCode`, `categoryName`, `boqCode`, `description`, `unit`, `plannedQuantity`, `materialCost`, `labourCost`, `subcontractCost`, `otherCost`, `plannedRate`, `plannedValue`, `startDate`, `endDate`, `materialCoefficients` (JSON array string), `status`

Import creates missing blocks / floors / work categories by code.

## Version control

See [`BOQ_VERSIONS.md`](./BOQ_VERSIONS.md).
