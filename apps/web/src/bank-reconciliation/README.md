# Bank reconciliation (Micro Phase 054)

Routes:
- `/accounting/bank-reconciliation` — session list + create
- `/accounting/bank-reconciliation/:sessionId` — import, unmatched panels, match, statement summary, complete

Nav: **Accounting → Bank Reconciliation** (`projectScope: none`).

## APIs

Base: `/bank-reconciliation`

| Endpoint | Permission |
|----------|------------|
| `GET /sessions` · `GET /sessions/:id` · `GET …/lines` · `GET …/unmatched` · `GET …/matches` · `GET …/statement` | `bank_reconciliation.view` |
| `POST /sessions` · `PATCH …/column-mapping` · `POST …/complete` | `bank_reconciliation.manage` |
| `POST …/import` (multipart CSV/XLS/XLSX) | `bank_reconciliation.import` |
| `POST …/auto-match` · `POST …/match` · `POST …/matches/:matchId/unmatch` | `bank_reconciliation.match` |
| `POST …/adjustments` | `bank_reconciliation.post` |

Bank account picker: `GET /company-bank-accounts` — `bank.view`.

Prompt alias `bank_reconciliation.finalise` does **not** exist — completion uses `bank_reconciliation.manage` (`POST …/complete`). Nest may complete with an outstanding difference; the audit payload records `reconciled` + `difference`.

## UI

| Piece | Role |
|-------|------|
| `SessionTable` | List sessions; open detail |
| `CreateSessionDrawer` | Create session (dates + opening/closing balances) |
| `ImportWizard` | Upload → map columns → preview → import (`replaceExisting` for re-import) |
| `UnmatchedPanels` | Select unmatched statement + book lines |
| `MatchingGrid` | Match history + unmatch (audit `undone`) |
| `ReconciliationSummary` | Counts, closing balance, adjusted balances, difference chip |

## Validation (client preview; Nest authoritative)

1. Column mapping requires `date` plus debit/credit and/or signed `amount`
2. File extensions: `.csv` `.txt` `.xls` `.xlsx` (≤ 10 MB)
3. Duplicate import warning when session already has lines
4. Manual match amount pairing: bank debit ↔ book credit (or net equality)

## Security

1. `RegistryRouteGuard` + Nest **403** → `PermissionDenied` — hiding buttons is not enough
2. Import / match / complete actions gated by Nest catalog codes above
3. Completed / cancelled sessions are read-only in the UI
