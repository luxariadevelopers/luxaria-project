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

- Auth + application layouts (sidebar, header, breadcrumbs)
- Protected routes + permission guards
- Project selector
- Global error boundary + notifications
- API client with refresh handling
- Shared DataTable, forms, file upload, confirmation dialog
- Placeholder pages: Login, Dashboard, Users, Projects, Settings
- **Investor portal shell** (`/investor/*`) — see [`src/investor-portal/README.md`](./src/investor-portal/README.md)
