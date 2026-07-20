# Investors API — Luxaria Developers ERP

Base path: `/api/v1/investors`  
Auth: Bearer access token required  
Swagger tag: **Investors**

## Design

- Investor **master data** is separate from **company shareholding** and from **project investment postings** (`investment.*`).
- Bank **account numbers are encrypted at rest** (AES-256-GCM) via `FIELD_ENCRYPTION_KEY`.
- Access is permission-scoped: users with only `investor.view` see **their linked investor** (`userId`); they cannot list or open other investors.
- Staff with `investor.view_all` can search and manage all investors.

## Investor types

| Value | Notes |
|-------|--------|
| `individual` | Person |
| `company` | **CIN required** |
| `partnership` | |
| `trust` | |
| `director_as_project_investor` | **directorId required** — project capital, not company equity |

## Permissions

| Permission | Use |
|------------|-----|
| `investor.view` | View/list (own record unless `view_all`) |
| `investor.view_all` | Unscoped list/view; required for KYC/activate |
| `investor.create` | Create |
| `investor.update` | Update |
| `investor.verify_kyc` | Verify / reject KYC |
| `investor.activate` | Activate / deactivate |
| `investor.upload_document` | Upload KYC documents |

`INVESTOR` system role has `investor.view` only (no `view_all`).

## Fields

`investorCode` (auto `INV-####`), `investorType`, `legalName`, `pan`, `gstin`, `cin`, contact, bank details, nominee, `kycStatus`, `status`, KYC documents.

### Status

`draft` | `pending_kyc` | `active` | `inactive`

### KYC status

`pending` | `verified` | `rejected`

## Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/investors` | `investor.create` | Create |
| GET | `/investors` | `investor.view` | List / search (scoped) |
| GET | `/investors/:id` | `investor.view` | View (scoped) |
| PATCH | `/investors/:id` | `investor.update` | Update |
| POST | `/investors/:id/verify-kyc` | `investor.verify_kyc` | Verify or reject KYC |
| POST | `/investors/:id/activate` | `investor.activate` | Activate (KYC verified) |
| POST | `/investors/:id/deactivate` | `investor.activate` | Deactivate |
| POST | `/investors/:id/documents` | `investor.upload_document` | Upload (`multipart` `file`) |
| GET | `/investors/:id/documents` | `investor.view` | List documents |

## Bank encryption

Request body uses plain `bankDetails.accountNumber`.  
Stored as `bankDetails.accountNumberEncrypted` (`enc:v1:...`).  
API responses return decrypted `accountNumber` only to the owner or users with `investor.view_all`; others never receive other investors’ data.
