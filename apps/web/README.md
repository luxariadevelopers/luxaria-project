# @luxaria/web

Luxaria Developers ERP — React web portal foundation.

## Stack

- React 19 + TypeScript + Vite
- React Router
- TanStack Query
- React Hook Form + Zod
- Axios (with token refresh)
- Material UI

## Scripts

```bash
pnpm --filter @luxaria/web dev       # http://localhost:9001
pnpm --filter @luxaria/web build
pnpm --filter @luxaria/web typecheck
```

API calls proxy to `http://localhost:9000` via Vite (`/api` → backend).

## Foundation includes

- Auth + responsive application shell (collapsible sidebar, mobile drawer, header, profile menu, `PageHeader`, breadcrumbs)
- Permission-aware navigation registry (`src/navigation/routeRegistry.ts`) — sidebar + `RegistryRouteGuard` share one access source
- Protected routes + `ProjectRequiredRoute` (via registry `projectScope`)
- Project context (`GET /project-access/me` + `GET /projects`), header selector/badge, no-access page
- Global error boundary + notifications
- API client with refresh handling
- Shared DataTable, forms, file upload, confirmation dialog
- Workflow timeline (`src/workflow-timeline`) for immutable approval / entity history
- Global quick search command palette (`src/quick-search`) — header icon + ⌘K
- Print / PDF action menu (`src/print-pdf`) for backend-generated PDFs
- Excel / CSV export dialog (`src/export`) for report and table downloads
- Site Operations dashboard (`src/site-operations-dashboard`) at `/dashboard/site`
- Placeholder pages: Login, Dashboard, Users, Projects, Settings

Shell docs: [`src/layouts/README.md`](./src/layouts/README.md).  
Navigation registry: [`src/navigation/README.md`](./src/navigation/README.md).  
Workflow timeline: [`src/workflow-timeline/README.md`](./src/workflow-timeline/README.md).  
Quick search: [`src/quick-search/README.md`](./src/quick-search/README.md).  
Print / PDF: [`src/print-pdf/README.md`](./src/print-pdf/README.md).  
Export: [`src/export/README.md`](./src/export/README.md).  
Site Operations: [`src/site-operations-dashboard/README.md`](./src/site-operations-dashboard/README.md).  
Notifications: [`src/notifications/README.md`](./src/notifications/README.md).  
Petty-cash fund transfers: [`src/petty-cash-transfers/README.md`](./src/petty-cash-transfers/README.md) (`/accounting/petty-cash/transfers`).
