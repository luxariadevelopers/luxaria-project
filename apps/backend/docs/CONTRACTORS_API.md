# Contractors API — Luxaria Developers ERP

Base path: `/api/v1/contractors`  
Swagger tag: **Contractors**

Master data for labour / work contractors: identity, compliance docs, project assignment, and performance summary.

## Permissions

| Permission | Usage |
|------------|--------|
| `contractor.view` | List, get, projects, documents, performance |
| `contractor.manage` | Create, update, verify, activate, block, assign, upload docs |

## Numbering

`NumberEntityType.CONTRACTOR` → `CON-######` (global, no FY).

## Fields

| Field | Notes |
|-------|--------|
| `contractorCode` | Auto `CON-######` |
| `legalName` / `tradeName` | Legal + trade names |
| `contractorType` | `labour`, `civil`, `electrical`, `plumbing`, `finishing`, `specialist`, `general`, `other` |
| `pan` / `gstin` | Unique when set (active rows) |
| `contact` | Email, phones, person, address |
| `bankDetails` | Account number encrypted at rest |
| `labourLicence` | Number, issuer, validity window |
| `workCategories` | Normalized lowercase tags |
| `rating` | 0–5 |
| `status` | `pending_verification` → `active` / `blocked` / … |

## Document categories

`general`, `agreement`, `pan`, `gst`, `bank_proof`, `labour_licence`, `insurance`, `cancelled_cheque`, `other`

Stored under `uploads/contractors/:id/…`.

## Workflow

```
Create → Pending verification → Verify → Active
                                  ↘ Reject → Pending verification
Active → Block → Blocked
```

Activate requires verified status and not blocked.

## Features

| Feature | Endpoint |
|---------|----------|
| Create | `POST /contractors` |
| Verify | `POST /contractors/:id/verify` |
| Assign projects | `POST /contractors/:id/projects` |
| Block | `POST /contractors/:id/block` |
| View performance | `GET /contractors/:id/performance` |
| Upload documents | `POST /contractors/:id/documents` (multipart) |

### Performance payload

- Manual `rating`
- Active project count
- Work measurement totals (submitted / verified quantities)
- Document counts (labour licence / insurance)
- Labour licence validity flag

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/contractors` |
| `GET` | `/contractors` |
| `GET` | `/contractors/:id` |
| `PATCH` | `/contractors/:id` |
| `POST` | `/contractors/:id/verify` |
| `POST` | `/contractors/:id/activate` |
| `POST` | `/contractors/:id/block` |
| `POST` | `/contractors/:id/projects` |
| `GET` | `/contractors/:id/projects` |
| `DELETE` | `/contractors/:id/projects/:projectId` |
| `GET` | `/contractors/:id/performance` |
| `POST` | `/contractors/:id/documents` |
| `GET` | `/contractors/:id/documents` |
