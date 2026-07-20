# Project Access API — Luxaria Developers ERP

Base path: `/api/v1/project-access`  
Auth: Bearer access token required  
Swagger tag: **Project Access**

## Rules (R-003)

1. Project isolation is **default-deny** for authenticated business routes.
2. Every handler must declare a scope: `@ProjectScoped` / `@GlobalScope` / `@InvestorScoped` / `@Public` / `@SystemInternal` / `@WebhookRoute`.
3. Users may access a project only via an **effective assignment**, unless they have Super Admin RBAC bypass or an effective `globalAccess` assignment.
4. **Directors are not hard-coded** for all-project access. Grant `globalAccess: true` on an assignment record.
5. Investors use **participation** checks on `@InvestorScoped` routes (not staff assignments alone).
6. Effective window: `status=active` AND `accessStartDate <= now` AND (`accessEndDate` null OR `>= now`).
7. Denied attempts are written to `unauthorized_project_access_attempts`.
8. `User.assignedProjects` is a denormalized cache of effective non-global project ids.
9. Client header `X-Project-Id` is a resolution source and is cross-checked against path/query/body/resource ownership — it never overrides resource ownership.

## Enforcement mode

| Env | Behaviour |
| --- | --- |
| `PROJECT_ACCESS_ENFORCEMENT=enforce` (default) | Fail closed |
| `PROJECT_ACCESS_ENFORCEMENT=observe` | Log + audit, allow (staging temporary only) |

## Assignment fields

| Field | Description |
|-------|-------------|
| `userId` | User receiving access |
| `projectId` | Project (required unless `globalAccess`) |
| `globalAccess` | All-project access for the window |
| `accessStartDate` | Inclusive start |
| `accessEndDate` | Inclusive end; null = open-ended |
| `status` | `active` \| `inactive` \| `expired` |

## Decorators

```ts
@ProjectScoped({
  mode: 'single' | 'filter',
  operation: 'read' | 'create' | 'update' | 'approve',
  resource: { resourceType: 'purchase-order', idParam: 'id' },
})

@GlobalScope()
@InvestorScoped({ mode: 'filter' })
@Public()
```

Legacy:

```ts
@RequireProjectAccess({ source: 'params', key: 'projectId', operation: 'read' })
```

## Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/project-access/me` | authenticated | Current user’s accessible project ids + global flag |
| GET | `/project-access/assignments` | `project_access.view` | List assignments |
| POST | `/project-access/assignments` | `project_access.assign` | Create assignment (selected or global) |
| PATCH | `/project-access/assignments/:id` | `project_access.manage` | Update dates / status / notes |
| POST | `/project-access/assignments/:id/activate` | `project_access.manage` | Activate |
| POST | `/project-access/assignments/:id/deactivate` | `project_access.manage` | Deactivate |
| GET | `/project-access/unauthorized-attempts` | `project_access.audit_view` | Audit denied attempts |
| GET | `/project-access/check/:projectId` | authenticated + project access | Read check |
| POST | `/project-access/check/:projectId/create` | authenticated + project access | Create check |
| POST | `/project-access/check/:projectId/update` | authenticated + project access | Update check |
| POST | `/project-access/check/:projectId/approve` | authenticated + project access | Approve check |

`POST /users/:id/projects` also creates/updates assignment records.

## Static safety

```bash
node scripts/r003-scan-route-scopes.mjs
```

Fails when any authenticated handler lacks scope classification.
