# Material Quality Inspections API — Luxaria Developers ERP

Base paths:
- `/api/v1/quality-inspections`
- `/api/v1/vendors/:vendorId/quality-score`

Swagger tag: **Quality Inspections**

## Permissions

| Permission | Usage |
|------------|--------|
| `quality.view` | List / get / vendor score |
| `quality.inspect` | Create, update, complete, cancel |

## Numbering

`NumberEntityType.QUALITY_INSPECTION` → `QI-YYYY-######` (FY + project-scoped).

## Results

| Result | GRN effect | Stock |
|--------|------------|--------|
| `accepted` | GRN → Accepted | Available on GRN post (accepted qty) |
| `partially_accepted` | GRN → Partially Accepted | Only accepted qty on post |
| `rejected` | GRN → Rejected | **Not available** — cannot post |
| `hold` | GRN stays Quality Check | No stock movement |

## Vendor quality score

On complete, aggregates completed inspections for the vendor:

- Accepted = 100 pts, Partial = 60, Hold = 40, Rejected = 0
- `score` 0–100, `ratingEquivalent` 0–5

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/quality-inspections` |
| `GET` | `/quality-inspections` |
| `GET` | `/quality-inspections/:id` |
| `PATCH` | `/quality-inspections/:id` |
| `POST` | `/quality-inspections/:id/complete` |
| `POST` | `/quality-inspections/:id/cancel` |
| `GET` | `/vendors/:vendorId/quality-score` |
