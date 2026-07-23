# COMPLETION — Site mobile gaps (118 / 120 / 121 / 122 / 124 / 125)

Final verify after Wave 1 parallel agents. Mobile typecheck + targeted unit tests green; no merge conflict markers in expense / labour-attendance / petty-cash paths.

| Phase | Feature | Status | Evidence |
|------|---------|--------|----------|
| **118** | Expense list + local drafts | DONE | `apps/mobile/src/site-expenses/draftStore.ts` + list Drafts tab + form autosave / Save draft / clear after submit |
| **120** | Expense beneficiary/engineer signatures | DONE | `signatureRequired.ts`, `SignatureCaptureField` on form + detail; web `SignaturesPanel` upload when editable |
| **121** | Petty-cash balance + request home | DONE | `PettyCashHomeScreen` + `BalanceCard` + `cashBalanceApi`; Home → `PettyCashHome` |
| **122** | Cash transfer acknowledge | DONE | `petty-cash-transfers/*` list/detail + `acknowledgePettyCashFundTransfer` → verify |
| **124** | Individual worker attendance | DONE | `IndividualAttendanceSection` + `buildAttendanceCreatePayload` individual mode; web `CreateAttendanceDrawer` |
| **125** | Material issue sign + submit | DONE | `uploadMaterialIssueSignature` + form recipient/issuer capture before `submitMaterialIssue` |

## Navigation (mobile)

- Home → Petty cash → `PettyCashHome` → Fund transfers list/detail
- Home → Expenses → list (Server / Drafts) → form (`draftId?`) / detail (signatures)
- Home → Material issue → form (signatures + submit)
- Home → Labour attendance → form group | individual

## Verify commands (2026-07-22)

```bash
pnpm --filter @luxaria/mobile typecheck
# exit 0

pnpm --filter @luxaria/mobile exec jest --runInBand \
  --testPathPattern='site-expenses|material-issue|petty-cash|labour-attendance|draftStore|buildAttendance|signatureRequired|workflowActions' \
  --passWithNoTests
# 11 suites / 45 tests passed
```

Note: `pnpm --filter @luxaria/mobile test:unit -- --testPathPattern=...` can mangle the pattern via an extra `--`; prefer `exec jest` with the pattern as above.
