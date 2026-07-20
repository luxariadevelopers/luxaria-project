# Journals (Micro Phases 043–045)

Routes:
- `/accounting/journals` — register (Phase 043)
- `/accounting/journals/new` — manual draft / submit (Phase 044)
- `/accounting/journals/:journalId` — detail, post, reverse, cancel (Phase 045)

Nav: **Accounting → Journals** (`journal.view`) and **Accounting → New Journal** (`journal.create`). Detail is a deep link from the register.

## APIs

| Endpoint | Permission |
|----------|------------|
| `GET /journals` · `GET /journals/:id` | `journal.view` |
| `POST /journals` · `PATCH /journals/:id` · `POST …/submit` · `POST …/cancel` | `journal.create` (no `journal.cancel` / `journal.submit`) |
| `POST /journals/:id/post` | `journal.post` |
| `POST /journals/:id/reverse` | `journal.reverse` |
| `GET /accounts/tree` | `account.view` (create picker) |
| `GET /financial-years` | `financial_year.view` (register filter) |

## UI (Phase 045)

| Piece | Role |
|-------|------|
| `JournalHeader` | Number, date, immutable banner, source link |
| `JournalLinesTable` | Debit/credit lines + totals |
| `ReverseJournalDialog` | Requires date + reason → Nest `journalDate` / `narration` |
| `CancelJournalDialog` | Optional reason (`journal.create`) |
| `buildJournalTimeline` | Lifecycle from journal fields |

## Rules

1. Posted / reversed / cancelled are immutable — no edit of history
2. Corrections only via reverse (new posted balancing JV)
3. Post/reverse call Nest FY lock — locked/closed periods return **403**
4. Reverse UI requires date + reason (Nest fields optional; client stricter)
5. Route guard + Nest 403 — hiding buttons is not enough
