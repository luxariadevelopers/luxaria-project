# Investors (Micro Phases 033–034)

Routes:
- `/capital/investors` — list (Phase 033)
- `/capital/investors/:investorId` — detail + KYC (Phase 034)

## APIs

| Endpoint | Permission |
|---|---|
| `GET/POST /investors` | `investor.view` / `investor.create` |
| `GET/PATCH /investors/:id` | `investor.view` / `investor.update` |
| `GET/POST /investors/:id/documents` | `investor.view` / `investor.upload_document` |
| `POST /investors/:id/verify-kyc` | `investor.verify_kyc` |
| `POST /investors/:id/activate` · `deactivate` | `investor.activate` (service also requires `investor.view_all`) |

## Security notes

- List projection (`toInvestorListRow`) strips `bankDetails` / account fields before the table.
- Detail bank card masks account numbers by default; Nest returns full `accountNumber` only for linked owner or `investor.view_all`.
- Catalog has **no** `investor.view_sensitive` / `investor.verify` — use `view_all` (decrypt) and `verify_kyc`.
- KYC checklist shows Nest audit fields: `kycVerifiedBy`, `kycVerifiedAt`, `kycNotes`.
- Route guard + Nest 403 — hiding buttons is not enough.

## Detail tabs (Phase 034)

Overview · Bank (masked) · Nominee · Documents · KYC checklist
