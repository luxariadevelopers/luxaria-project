# Company shareholding (Micro Phase 032)

Versioned company equity at `/capital/shareholding`
(nav: **Capital & Investment → Shareholding**).

Company shareholding is **not** project investment.

## Permissions (Nest catalog)

| Permission | Use |
|------------|-----|
| `shareholding.view` | Active holdings, history, change requests |
| `shareholding.propose` | Propose change (API) |
| `shareholding.approve` | Approve / reject |

There is **no** `shareholding.change` permission code.

## APIs consumed

| Endpoint | Permission |
|----------|------------|
| `GET /company-shareholding` | `shareholding.view` |
| `GET /company-shareholding/history` | `shareholding.view` |
| `GET /company-shareholding/change-requests` | `shareholding.view` |
| `POST .../change-requests` | `shareholding.propose` |
| `POST .../change-requests/:id/approve` | `shareholding.approve` |
| `POST .../change-requests/:id/reject` | `shareholding.approve` |

Approving closes prior rows (`effectiveTo`) and inserts a new `version` —
prior percentages / share counts are never overwritten.

## UI rules

1. **Total % indicator** — active total must equal 100% (Nest tolerance `0.0001`)
2. **Effective-date timeline** — active vs historical versions
3. **Overlap detection** — client flags intersecting `[effectiveFrom, effectiveTo)` ranges per director
4. Route guard + 403 → `PermissionDenied`

## Components

| Export | Role |
|--------|------|
| `ShareholdingTable` | Versioned holdings grid |
| `EffectiveDateTimeline` | Effective-from / to strip |
| `TotalPercentageIndicator` | 100% validation display |
| `ChangeRequestsPanel` | Pending approve/reject |
| `findOverlappingEffectiveDates` | Overlap validation helper |
