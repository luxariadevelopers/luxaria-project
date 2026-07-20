# Web application shell (Micro Phase 011)

Desktop-first portal chrome for `@luxaria/web`.

## Pieces

| Piece | File | Notes |
|---|---|---|
| Layout | `AppLayout.tsx` | Header + collapsible sidebar + page header + outlet |
| Sidebar | `Sidebar.tsx` | Module groups, permission filter, desktop collapse, mobile drawer |
| Header | `Header.tsx` | Menu button (sm), project selector/badge, quick search icon, profile menu |
| Quick search | `../quick-search` | Command palette (⌘K); Phase 017 |
| Profile menu | `ProfileMenu.tsx` | Identity, settings, confirmed sign-out |
| Page header | `PageHeader.tsx` | Breadcrumbs + route title |
| Nav registry | `../navigation/routeRegistry.ts` | Paths, permissions, project scope (Phase 012) |

## Permissions

Menu items declare `anyOf` catalog permissions. Filtering is UX only — `PermissionGuard` / `ProjectRequiredRoute` and backend 403 handling remain required.

## Responsive behaviour

- `md+`: permanent sidebar; collapse to icon rail (persisted in `localStorage`)
- `<md`: temporary drawer opened from the header menu button
- Main column uses `minWidth: 0` and fluid container padding to avoid horizontal overflow

## APIs

No new business APIs. Auth identity/permissions and project context come from existing providers.
