# Directors (Micro Phase 031)

Routes:
- `/capital/directors` — list
- `/capital/directors/:directorId` — detail (overview, documents, shareholding)

## APIs

| Endpoint | Permission |
|---|---|
| `GET/POST /directors` | `director.view` / `director.create` |
| `GET/PATCH /directors/:id` | `director.view` / `director.update` |
| `GET/POST /directors/:id/documents` | `director.view` / `director.upload_document` |
| `GET /company-shareholding` | `shareholding.view` |

Company shareholding is equity (seed directors at 25% each) — not project investment.
Full history / change requests: `/capital/shareholding` (Phase 032, `apps/web/src/shareholding`).

DIN: 8 digits. PAN: `^[A-Z]{5}[0-9]{4}[A-Z]$` (validated when editable).
