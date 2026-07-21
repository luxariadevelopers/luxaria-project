# IAM Project / Site Access Model

## Project assignment

Collection: `project_assignments`  
Fields: `userId`, `projectId` | null, `globalAccess`, `accessStartDate`, `accessEndDate`, `status`

- Permission alone never grants project access (R-003)
- `globalAccess` is configuration-driven, never implied by Director role code

## Site master

Collection: `project_sites`  
Fields: `companyId`, `projectId`, `siteCode`, `siteName`, `type`, `status`, …

## Site assignment

Collection: `site_assignments`  
Fields: `userId`, `employeeId?`, `projectId`, `siteId`, `effectiveFrom/To`, `status`, `isDefault`

Unique active: `userId + projectId + siteId`

## Enforcement

1. HTTP: `ProjectAccessGuard` resolves project; when `siteId` present and actor site-scoped, `SiteAccessService.assertSiteAccessIfScoped`
2. Service layer: existing `ProjectScopedDataHelper` for protected modules; site assert for site-bearing requests
3. Client `siteId` cannot override resource ownership project/site

## Site Engineer default

Role `SITE_ENGINEER` (seed): DPR, stock view/issue, petty cash request, measurements, attendance, documents — **not** accounting, RBAC, investors, payments.
Plus `site_access.view` for mobile site bootstrap.
