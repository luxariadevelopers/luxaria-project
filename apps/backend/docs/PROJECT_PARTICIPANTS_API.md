# Project Participants API — Luxaria Developers ERP

Base path: `/api/v1/projects/:projectId/participants`  
Auth: Bearer access token required  
Swagger tag: **Project Participants**

## Design rules

1. **Project profit sharing ≠ company shareholding** — percentages here do not affect `company_shareholdings`.
2. **Profit-share changes require a new version** — approved rows are never overwritten; prior version gets `effectiveTo`.
3. **Finalise ⇒ active approved profit shares total 100%**.
4. **History is append-only** — list via `GET .../history`.
5. **Approval statuses:** `draft` → `submitted` → `approved` | `rejected`.

## Participant types

| Value | `participantId` refs |
|-------|----------------------|
| `director` | Director |
| `outside_investor` | Investor |
| `company` | Company |
| `joint_venture_party` | Company or Investor |

## Instrument types

`director_loan` | `unsecured_loan` | `project_investment` | `equity_contribution` | `joint_venture_contribution` | `other`

Loan instruments require `interestRate`.

## Permissions

| Permission | Use |
|------------|-----|
| `project_participant.view` | Active list, history, configuration, documents |
| `project_participant.create` | Create draft / new version |
| `project_participant.update` | Update draft only |
| `project_participant.submit` | Submit for approval |
| `project_participant.approve` | Approve / reject |
| `project_participant.finalize` | Finalise / unfinalise |
| `project_participant.upload_document` | Agreement upload |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create draft participant |
| GET | `/` | Active approved participants |
| GET | `/history` | Full version history |
| GET | `/configuration` | Finalisation + totals |
| POST | `/finalize` | Require active % = 100% |
| POST | `/unfinalize` | Allow new drafts again |
| GET | `/:recordId` | View version |
| PATCH | `/:recordId` | Update draft |
| POST | `/:recordId/versions` | New version (profit-share change) |
| POST | `/:recordId/submit` | Submit |
| POST | `/:recordId/approve` | Approve (closes prior version) |
| POST | `/:recordId/reject` | Reject |
| POST | `/:recordId/documents` | Upload agreement |
| GET | `/:recordId/documents` | List documents |

## Fields

`projectId`, `participantType`, `participantId`, `commitmentAmount`, `expectedContributionDate`, `actualContributionAmount`, `approvedProfitSharePercentage`, `lossSharePercentage`, `interestRate`, `instrumentType`, `effectiveFrom`, `effectiveTo`, `agreementDocumentId`, `status`, plus `version` / `participantKey` for history.
