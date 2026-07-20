# Workflow timeline (Micro Phase 016)

Reusable immutable audit timeline for workflow detail pages.

## APIs consumed

| Endpoint | Permission | Use |
|----------|------------|-----|
| `GET /projects/:projectId/approvals/:id/timeline` | `approval.view` (+ project read) | Approval engine event log |
| `GET /audit-logs?entityType=&entityId=` | `audit.view` | Entity history (status snapshots in before/after) |

Do not invent paths or action/status values. Unknown/legacy actions render with a safe label and a **Legacy** chip.

## Components

| Export | Role |
|--------|------|
| `WorkflowTimeline` | Loading / empty / error / permission-denied / list |
| `TimelineItem` | Actor, timestamp, action, comment, documents, status transition |
| `useApprovalTimeline` | Fetch + normalise approval timeline |
| `useEntityAuditTimeline` | Fetch + normalise audit entity history |
| `normalize*` / `mergeTimelineEvents` | From `@luxaria/shared-types` |

## Permissions

History is visible only when the caller sets `canView` from the **entity view** permission (or `approval.view` for approval detail). Hiding UI is not enough:

1. Evaluate permission before enabling hooks (`enabled: canView && hasPermission(...)`).
2. Keep route/action guards on the parent detail page.
3. Surface backend `403` via `RetryPanel` / `PermissionDenied`.

## Missing actor & legacy events

- Empty / null actor → **Unknown actor**
- Unknown action strings → title-cased label + Legacy chip
- Invalid / missing timestamps → **Time unknown**
- Loose embedded history → `normalizeLegacyTimelineEvents`

## Demo

`/dev/workflow-timeline` — not in the sidebar.
