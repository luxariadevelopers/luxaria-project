# Labour Categories API — Luxaria Developers ERP

Base path: `/api/v1/labour-categories`  
Swagger tag: **Labour Categories**

Master data for site labour trades with company default rates and scoped overrides.

## Permissions

| Permission | Usage |
|------------|--------|
| `labour_category.view` | List, get, resolve-rate, list rates |
| `labour_category.manage` | Create, update, activate/deactivate, seed, rate CRUD |

## Numbering

`NumberEntityType.LABOUR_CATEGORY` → `LBC-######` (global).

## Category fields

| Field | Notes |
|-------|--------|
| `categoryCode` | Auto `LBC-######` |
| `name` | Unique (case-insensitive) |
| `skillLevel` | `unskilled` / `semi_skilled` / `skilled` / `highly_skilled` / `supervisory` |
| `defaultDailyRate` | Company default |
| `overtimeRate` | Company default OT |
| `status` | `active` / `inactive` |

## Standard seed

`POST /labour-categories/seed-standard` creates (idempotent by name):

Mason, Helper, Carpenter, Bar Bender, Electrician, Plumber, Painter, Welder, Supervisor, Machine Operator.

## Rate overrides

`POST /labour-categories/:id/rates` — requires `projectId` and/or `contractorId`.

| Scope | Fields |
|-------|--------|
| Project | `projectId` only |
| Contractor | `contractorId` only |
| Project + contractor | both |

Each rate has `dailyRate`, `overtimeRate`, `effectiveDate`, `status`.

### Resolve priority

`GET /labour-categories/resolve-rate?labourCategoryId=&projectId?&contractorId?&asOf?`

1. Project + contractor  
2. Project  
3. Contractor  
4. Company defaults on the category  

Uses latest active rate with `effectiveDate ≤ asOf`.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/labour-categories` |
| `POST` | `/labour-categories/seed-standard` |
| `GET` | `/labour-categories` |
| `GET` | `/labour-categories/resolve-rate` |
| `GET` | `/labour-categories/by-code/:categoryCode` |
| `GET` | `/labour-categories/:id` |
| `PATCH` | `/labour-categories/:id` |
| `POST` | `/labour-categories/:id/activate` |
| `POST` | `/labour-categories/:id/deactivate` |
| `POST` | `/labour-categories/:id/rates` |
| `GET` | `/labour-categories/:id/rates` |
| `PATCH` | `/labour-categories/rates/:rateId` |
