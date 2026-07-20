# Contractor agreements (Micro Phase 089)

Route: `/contractors/agreements`  
Nav: **Contractors → Agreements** (`projectScope: required`)

## APIs

Base: `/contractor-agreements`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` · `GET /by-number/:agreementNumber/versions` · `GET /expiry-alerts` | `contractor_agreement.view` |
| `POST /` · `PATCH /:id` · `POST /:id/amend` · `POST /:id/submit` · `POST /:id/terminate` · expiry acknowledge | `contractor_agreement.manage` |
| `POST /:id/approve` · `POST /:id/reject` | `contractor_agreement.approve` |

See [`CONTRACTOR_AGREEMENTS_API.md`](../../../backend/docs/CONTRACTOR_AGREEMENTS_API.md).

## UI rules

1. **Versioning** — `agreementNumber` stable; `version` increments on amend. Only one open draft/pending/rejected version per number.
2. **Amend** — only from `active`; creates draft `version + 1` with same number.
3. **Approval** — submit creates Approvals request; final activation when fully approved.
4. **Documents** — signed PDF via documents module (`document.upload`), stored on `agreementDocument`.
5. **Validation** — client mirrors Nest date/rate/retention/manpower rules; server authoritative.
6. **Route guard + Nest 403** — hiding buttons is not enough.

## Components

`AgreementTable`, `AgreementFormDrawer`, `AgreementDocumentPanel`, `VersionHistoryTable`, amend/reject/terminate dialogs, expiry alert banner.

## Deep link

`/contractors/agreements/:agreementId` (`contractor-agreement-detail`).
