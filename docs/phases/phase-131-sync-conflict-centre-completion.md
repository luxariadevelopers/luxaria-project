# Micro Phase 131 — Mobile sync conflict centre

**Branch:** `micro-phase-131-pending-sync-conflicts`  
**Worktree:** `~/.cursor/worktrees/phase131-bc9c0d58/luxaria project-fa80d8f4bb3b`  
**Date:** 2026-07-20

## Objective

Provide a clear way to resolve failed or conflicting offline records.

## Files / endpoints used (no invented backends)

| Kind | Path / API |
|---|---|
| Local queue | `apps/mobile/src/offline/*` (SQLite + memory repo) |
| Transport (existing) | `POST /documents/presign-upload`, `POST /documents/:id/confirm-upload`, queued `txn.endpoint` with `Idempotency-Key` |
| Sync UI | `PendingSyncScreen`, `ConflictDetailScreen`, `src/sync-centre/*` |
| Nav | Profile → Pending Sync tab; stack `ConflictDetail` |

## Delivered

| Area | Detail |
|---|---|
| Screens | Pending Sync (filters, needs-attention default), Conflict Detail |
| Components | `QueueFilterBar`, filter helpers, resolution copy, open-record mapping |
| Actions | Retry (idempotent), confirmed discard draft, open GRN/DPR forms |
| Validation | Permanent validation (`400`/`422` / `VALIDATION_ERROR` / `BAD_REQUEST`) disables auto-retry; discard never silent |
| Security | `createdByUserId` ownership + project access / bypass; 403 → forbidden failure kind |
| Tests | Repeated manual retry; permanent validation; discard confirmation; ownership/project denial; filters |
| Docs | `docs/ui-api-matrix.md`, `apps/mobile/README.md` |

## Acceptance

- Users can filter and open every failed/conflict row.
- Conflict detail explains the error and next step.
- Retry preserves Idempotency-Key; permanent validation does not auto-loop.
- Discard requires explicit confirmation and never runs automatically.

## Merge / cleanup

- Merge back: `/apply-worktree`
- Cleanup: `/delete-worktree`
