# Vendors API — Luxaria Developers ERP

Base path: `/api/v1/vendors`  
Swagger: `http://localhost:9000/api/docs` (Vendors tag)

## Permissions

| Permission | Usage |
|------------|--------|
| `vendor.view` | List, get, search, projects, documents, ledger placeholder |
| `vendor.manage` | Create, update, verify, activate, block, assign projects, upload docs |

## Fields

- `vendorCode` — auto `VEN-######`
- `legalName`, `tradeName`
- `gstin`, `pan`
- `contact`, `billingAddress`
- `bankDetails` (account number encrypted at rest)
- `materialCategories[]`
- `paymentTerms`, `creditLimit`
- `tdsApplicable`, `tdsPercentage`
- `retentionPercentage`, `rating`
- `verificationStatus`, `status` (`draft` / `pending_verification` / `active` / `blocked` / `inactive`)

## Endpoints

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/vendors` | Create (pending verification) |
| `GET` | `/vendors` | Search (`search`, `status`, `materialCategory`, `projectId`, …) |
| `GET` | `/vendors/:id` | Detail |
| `PATCH` | `/vendors/:id` | Update |
| `POST` | `/vendors/:id/verify` | `{ verified, notes? }` |
| `POST` | `/vendors/:id/activate` | Requires verified; not blocked |
| `POST` | `/vendors/:id/block` | `{ reason? }` |
| `POST` | `/vendors/:id/projects` | Assign `{ projectId, notes? }` |
| `GET` | `/vendors/:id/projects` | Active assignments |
| `DELETE` | `/vendors/:id/projects/:projectId` | Unassign |
| `POST` | `/vendors/:id/documents` | Multipart agreement / KYC docs |
| `GET` | `/vendors/:id/documents` | List docs |
| `GET` | `/vendors/:id/ledger` | Payable ledger **placeholder** |

## Lifecycle

```
create → pending_verification
  → verify(true) → verified + active
  → block → blocked
  → activate (only if verified and not blocked)
```
