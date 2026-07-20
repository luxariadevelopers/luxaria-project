# Company API — Luxaria Developers ERP

Base path: `/api/v1/companies`  
Auth: Bearer access token required  
Swagger tag: **Company**

## Design

- One **primary** company is seeded for Luxaria Developers Pvt. Ltd.
- Schema supports **multiple companies later** (`companyCode` unique, `isPrimary` for default).
- Current capital/address live on the company document.
- **Capital history is append-only** — past rows are never overwritten.
- Address changes close the previous history row (`effectiveTo`) and insert a new current row.

## Seed

| Field | Value |
|-------|--------|
| legalName | Luxaria Developers Pvt. Ltd. |
| companyCode | CMP-0001 |
| authorisedShareCapital | ₹1,00,00,000 (`10000000`) |
| paidUpShareCapital | `0` |
| financialYearStartMonth | `4` (April) |
| isPrimary | `true` |

## Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/companies/primary` | `company.view` | View primary company |
| GET | `/companies/:id` | `company.view` | View by id |
| PATCH | `/companies/:id` | `company.update` | Update profile / addresses |
| PATCH | `/companies/:id/statutory` | `company.update` | CIN, PAN, TAN, GSTIN, legal name |
| POST | `/companies/:id/capital` | `company.update` | Change capital + append history |
| POST | `/companies/:id/logo` | `company.upload_logo` | Upload logo (`multipart/form-data`, field `file`) |
| GET | `/companies/:id/address-history` | `company.view` | Address history |
| GET | `/companies/:id/capital-history` | `company.view` | Capital history |

## Capital update body

```json
{
  "capitalType": "authorised",
  "newAmount": 20000000,
  "changeReason": "Board resolution",
  "reference": "BR-2026-01"
}
```

`capitalType`: `authorised` | `paid_up`  
Paid-up cannot exceed authorised.

## Statutory validation

- PAN: `ABCDE1234F`
- TAN: `CHEL12345A`
- GSTIN: 15-character GSTIN
- CIN: Indian CIN format
