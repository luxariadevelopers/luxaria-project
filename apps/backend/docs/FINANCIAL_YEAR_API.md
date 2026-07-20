# Financial Year API — Luxaria Developers ERP

Base path: `/api/v1/financial-years`  
Auth: Bearer access token required  
Swagger tag: **Financial Year**

## Rules

1. Financial years **must not overlap** (per company).
2. Only **one** financial year can be `isCurrent` per company.
3. **Locked** years reject accounting postings (`assertPostingAllowed` / validate with `forPosting: true`).
4. Unlock requires:
   - a request with a **reason** (`financial_year.manage`)
   - **approval** by a different user with `financial_year.unlock`
5. Schema is company-scoped (`companyId`) for multi-company later.

## Fields

| Field | Description |
|-------|-------------|
| name | e.g. `FY 2026-27` |
| startDate / endDate | Inclusive window |
| status | `open` \| `closed` \| `locked` |
| isCurrent | Current working year flag |
| isLocked | Blocks postings when true |
| lockedAt / lockedBy | Lock audit |

## Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/financial-years` | `financial_year.manage` | Create |
| GET | `/financial-years` | `financial_year.view` | List |
| GET | `/financial-years/current` | `financial_year.view` | Current year |
| GET | `/financial-years/:id` | `financial_year.view` | By id |
| POST | `/financial-years/:id/set-current` | `financial_year.manage` | Set current |
| POST | `/financial-years/:id/lock` | `financial_year.manage` | Lock |
| POST | `/financial-years/:id/unlock-requests` | `financial_year.manage` | Request unlock + reason |
| GET | `/financial-years/:id/unlock-requests` | `financial_year.view` | List unlock requests |
| POST | `/financial-years/:id/unlock-requests/:requestId/approve` | `financial_year.unlock` | Approve unlock |
| POST | `/financial-years/:id/unlock-requests/:requestId/reject` | `financial_year.unlock` | Reject unlock |
| POST | `/financial-years/validate-date` | `financial_year.view` | Validate transaction date |

## Validate date body

```json
{
  "transactionDate": "2026-07-15",
  "forPosting": true,
  "companyId": "<optional>"
}
```

## Programmatic use

Accounting modules should call:

```ts
await financialYearService.assertPostingAllowed(txnDate, companyId);
```

before journal / payment / expense posting.
