# Manpower shortfall (Micro Phase 092)

Route: `/contractors/manpower-shortfall`
Nav: **Contractors → Manpower Shortfall** (`projectScope: required`)

## APIs

Base: `/manpower-planning` (Swagger tag **Manpower Planning**)

| Endpoint | Permission |
|----------|------------|
| `GET /shortfall-alerts` | `manpower_shortfall.view` |
| `POST /shortfall-alerts/evaluate` · `POST /shortfall-alerts/:id/acknowledge` | `manpower_shortfall.acknowledge` |
| `GET /compare` (schedule-impact panel) | `manpower_plan.view` |

Phase alias `manpower_shortfall.escalate` is **not** in the Nest catalog — escalate maps to `manpower_shortfall.acknowledge`.

## Nest thresholds (UI severity)

| Alert type | Severity |
|------------|----------|
| `below_60_three_days`, `missing_critical_skill` | critical |
| `below_80_two_consecutive_days`, `no_attendance_submitted`, `work_progress_behind_plan` | warning |

## UI

| Piece | Role |
|-------|------|
| `ShortfallTable` | Alerts with severity, headcount layers, escalation |
| `ConsecutiveDayIndicator` | Streak days chip |
| `ScheduleImpactPanel` | Agreed / planned / actual + impact days via compare |

## Tests

- `shortfallSeverity.test.ts` — warning/critical states
- `roleAccess.test.ts` — Nest view / acknowledge
