# Entity detail layout (Micro Phase 015)

Reusable information architecture for business-record detail screens.

## Composition order

1. `DetailHeader` — title, code, back link  
2. `StatusStrip` — catalog-backed status chip  
3. `EntityActionBar` — permission + **explicit** status allow-list (sticky bottom on `xs`, sticky under chrome from `sm`)  
4. `SummaryCards` — key facts  
5. `EntityDetailTabs` — scrollable, permission-gated tabs  
6. Timeline slot — compose `WorkflowTimeline` (do not reimplement)  
7. Extra `children`

Wrap with `EntityDetailLayout` for loading / empty / 403 / retry / project-missing states.

## Status / action rules

Every action must declare `permission` and `allowedStatuses`. Actions are never inferred from catalog transitions alone. `resolveVisibleActions` filters the bar; `assertActionAllowed` re-checks on click.

Hiding a button is not enough — keep `RegistryRouteGuard` / `ProjectRequiredRoute` and handle API 403 via `RetryPanel` / `PermissionDenied`.

## Demo

`/dev/entity-detail` — not in the sidebar.
