# Directors & Company Shareholding API — Luxaria Developers ERP

Base path: `/api/v1`  
Auth: Bearer access token required  
Swagger tag: **Directors & Shareholding**

## Design rules

1. **Company shareholding ≠ project investment** — equity lives in `company_shareholdings`; project capital uses `investment.*` permissions and a separate module.
2. **Active percentages must total 100%** — proposals that do not sum to 100% are rejected.
3. **History is versioned and append-only** — approving a change sets `effectiveTo` on current rows and inserts a new `version`; prior `numberOfShares` / `percentage` are never overwritten.
4. **Changes require approval** — propose → approve/reject; the proposer cannot approve their own request.
5. **Seed** — four placeholder directors at **25%** each (`SEED-INITIAL-25PCT`, version `1`).

## Permissions

| Permission | Use |
|------------|-----|
| `director.view` | List/view directors and documents |
| `director.create` | Create director |
| `director.update` | Update director |
| `director.upload_document` | Upload director documents |
| `shareholding.view` | Active holdings, history, change requests |
| `shareholding.propose` | Propose shareholding change |
| `shareholding.approve` | Approve or reject change request |

## Seed (placeholders)

| Field | Value |
|-------|--------|
| Directors | 4 placeholders (`Director One` … `Director Four`) |
| DIN | `10000001` … `10000004` |
| Shares each | `250000` @ face value ₹10 |
| Percentage each | `25%` |
| Total | `100%` / `10,00,000` shares (aligned with authorised capital ₹1,00,00,000) |
| `directorCode` | Auto via numbering `DIR-######` |

## Director endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/directors` | `director.create` | Create |
| GET | `/directors` | `director.view` | List (`search`, `status`, `companyId`) |
| GET | `/directors/:id` | `director.view` | View |
| PATCH | `/directors/:id` | `director.update` | Update |
| POST | `/directors/:id/documents` | `director.upload_document` | Upload (`multipart` field `file`) |
| GET | `/directors/:id/documents` | `director.view` | List documents |

### Director fields

`directorCode`, `userId`, `fullName`, `din`, `pan`, contact (`email`, `phone`, `address`), `appointmentDate`, `status` (`active` \| `inactive` \| `resigned`), documents (separate collection).

DIN: 8 digits. PAN: Indian PAN format when provided.

## Company shareholding endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/company-shareholding` | `shareholding.view` | Active holdings (`effectiveTo` null) |
| GET | `/company-shareholding/history` | `shareholding.view` | Full version history |
| POST | `/company-shareholding/change-requests` | `shareholding.propose` | Propose change (must total 100%) |
| GET | `/company-shareholding/change-requests` | `shareholding.view` | List change requests |
| POST | `/company-shareholding/change-requests/:requestId/approve` | `shareholding.approve` | Approve → new version |
| POST | `/company-shareholding/change-requests/:requestId/reject` | `shareholding.approve` | Reject |

### Shareholding fields

`directorId`, `effectiveFrom`, `effectiveTo`, `numberOfShares`, `faceValue`, `percentage`, `approvalReference`, `documentId`, plus `version` / `changeRequestId` for audit.

### Propose body

```json
{
  "reason": "Board-approved redistribution of equity",
  "approvalReference": "BR-2026-SH-01",
  "proposedHoldings": [
    {
      "directorId": "...",
      "numberOfShares": 400000,
      "faceValue": 10,
      "percentage": 40
    }
  ]
}
```

All lines together must sum to **100%** percentage and a positive share total. Only one pending change request is allowed per company.
