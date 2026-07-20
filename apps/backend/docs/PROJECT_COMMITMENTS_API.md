# Project Contribution Commitments API — Luxaria Developers ERP

Base path: `/api/v1/projects/:projectId/commitments`  
Auth: Bearer access token required  
Swagger tag: **Project Contribution Commitments**

## Design rules

1. **Approved commitments cannot be edited in place** — use amend (new version).
2. **Amendments are versioned** — same `commitmentNumber`, incremented `version`; prior approved row becomes `superseded`.
3. **Commitment amount ≥ received amount** — enforced on create, amend, and approve.
4. **Overdue commitment alerts** — deferred (hook stub in place).

## Status flow

`draft` → `submitted` → `approved`  
Also: `cancelled`, `superseded` (after amendment approval).

## Fields

`projectId`, `participantId` (active approved project participant record), `commitmentNumber` (`COM-YYYY-######`), `commitmentAmount`, `commitmentDate`, `dueDate`, `contributionType`, `paymentSchedule`, `expectedBankAccount`, `agreementReference`, `remarks`, `status`, plus tracked `receivedAmount` / computed `pendingAmount`.

## Permissions

| Permission | Use |
|------------|-----|
| `contribution_commitment.view` | List / view / summary / history |
| `contribution_commitment.create` | Create draft |
| `contribution_commitment.submit` | Submit |
| `contribution_commitment.approve` | Approve |
| `contribution_commitment.amend` | Create amendment version |
| `contribution_commitment.cancel` | Cancel |
| `contribution_commitment.record_receipt` | Record received amounts |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create draft |
| GET | `/` | List |
| GET | `/summary` | Committed / received / pending totals |
| GET | `/by-number/:commitmentNumber/history` | Version history |
| GET | `/:id` | View |
| POST | `/:id/submit` | Submit |
| POST | `/:id/approve` | Approve |
| POST | `/:id/amend` | Amend (new version) |
| POST | `/:id/cancel` | Cancel |
| POST | `/:id/receipts` | Record receipt |
