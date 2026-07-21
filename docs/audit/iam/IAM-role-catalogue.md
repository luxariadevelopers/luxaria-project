# IAM Role Catalogue

System roles are seeded in `apps/backend/src/modules/rbac/role.seed.ts`.  
Reseed refreshes system-role permission arrays; custom company roles are not overwritten.

## Site Engineer (`SITE_ENGINEER`)

**Intended for:** field execution on assigned project + site.

**Default allows (seed):** project view, DPR create/view, measurement, attendance, manpower, running bill create/verify, stock view/issue, purchase request, contractor view, document upload, expense create/view, petty cash request/view, `site_access.view`.

**Default denies (by omission):** company/user/RBAC admin, project create/close, journals/bank/trial balance, investor data, vendor/contractor payments, payroll/HR confidential, company-wide reports.

**Scope:** requires `project_assignments` + typically `site_assignments` (provision flow always creates both).

## Other system roles

See `IAM-role-inventory.csv` and `role.seed.ts` for Director, Project Manager, Storekeeper, Accountant, Finance Manager, Investor, Auditor, etc.

Templates are starting points — companies customise via Roles UI without silent overwrite of non-system roles.
