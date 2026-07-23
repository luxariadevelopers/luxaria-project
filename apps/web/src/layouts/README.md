# Web application shell (Micro Phase 011 + Wave 1)

Desktop-first portal chrome for `@luxaria/web`, with phone-friendly nav.

## Pieces

| Piece | File | Notes |
|---|---|---|
| Layout | `AppLayout.tsx` | Header + sidebar + bottom bar + QuickSearchProvider + outlet |
| Sidebar | `Sidebar.tsx` | Pillars, search-in-nav, collapsed pillar flyout, two-step mobile drawer |
| Bottom bar | `MobileBottomNav.tsx` | `<md` Home / Approvals / More |
| Header | `Header.tsx` | Menu, project picker, quick search, notifications, profile |
| Quick search | `../quick-search` | Command palette (⌘K) |
| Profile menu | `ProfileMenu.tsx` | Identity, settings, confirmed sign-out |
| Page header | `PageHeader.tsx` | Breadcrumbs + route title |
| Nav registry | `../navigation/routeRegistry.ts` | Paths, permissions, project scope |

## Permissions

Menu items declare `anyOf` catalog permissions. Filtering is UX only — `PermissionGuard` / `ProjectRequiredRoute` and backend 403 handling remain required. Sidebar uses `getVisibleNavPillars` / `filterNav`.

## Responsive behaviour

- `md+`: permanent sidebar; collapse to pillar-icon rail with flyout (persisted in `localStorage`)
- `<md`: temporary two-step drawer (pillars → items) + Frequent strip (`sessionStorage`) + bottom bar
- Main column uses `minWidth: 0`, fluid padding, and bottom padding for the phone bar

## APIs

No new business APIs. Auth identity/permissions and project context come from existing providers.
