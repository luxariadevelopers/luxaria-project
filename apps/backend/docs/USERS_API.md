# User Management API — Luxaria Developers ERP

Base path: `/api/v1/users`  
Auth: Bearer access token required  
Swagger tag: **Users**  
Permissions: each route requires a `user.*` permission (see [RBAC_API.md](./RBAC_API.md)); Super Admin bypasses.

## Rules

- Email unique when provided
- Mobile unique when provided
- Deactivated users cannot log in (`status=inactive`)
- Deletes are soft deletes (`isDeleted`)
- Passwords never returned in API responses
- `roleIds` must reference active roles
- Audit logging of changes is deferred to the audit-log phase

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Create user |
| GET | `/users` | List / search / filter (paginated) |
| GET | `/users/:id` | User details |
| PATCH | `/users/:id` | Update user |
| POST | `/users/:id/activate` | Activate |
| POST | `/users/:id/deactivate` | Deactivate + revoke sessions |
| POST | `/users/:id/reset-password` | Admin password reset + revoke sessions |
| POST | `/users/:id/roles` | Replace `roleIds` |
| POST | `/users/:id/projects` | Assign projects (merge) |
| POST | `/users/:id/projects/remove` | Remove projects |
| DELETE | `/users/:id` | Soft delete + revoke sessions |

## List query params

- `page`, `limit`, `sortBy`, `sortOrder`
- `search` — name / email / mobile / employeeId / userCode
- `status` — `active` \| `inactive` \| `locked`
- `department`
- `projectId`
- `roleId`

## Create body (example)

```json
{
  "fullName": "Site Engineer",
  "email": "engineer@luxaria.dev",
  "mobile": "9876543210",
  "password": "ChangeMe123!",
  "employeeId": "E-101",
  "designation": "Site Engineer",
  "department": "Projects",
  "assignedProjects": [],
  "roleIds": [],
  "joiningDate": "2026-01-15"
}
```

`roleIds` must be active role ObjectIds (validated by the RBAC module).
