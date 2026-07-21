# IAM Migration Plan

## Non-destructive strategy

1. Keep `User.department` / `User.designation` / `User.employeeId` strings for backward compatibility  
2. Add Employee / Department / Designation / Site collections  
3. Link `Employee.userId` when provisioning; optional backfill later  
4. Preserve all existing `project_assignments` and role ObjectIds  
5. Users with project assignment but no site assignment remain **project-wide**  

## Dry-run backfill (future)

```
# Pseudocode — not auto-run
for user in users where employeeId string set and no Employee.userId:
  create Employee draft from user fields
```

## Rollback

- Disable new routes/UI; existing auth/RBAC/project-access unchanged  
- Dropping new collections is optional; schemas are additive  

## No automatic historical permission rewrite

Catalog additions only expand available codes; existing role documents unchanged until seed refresh of **system** roles.
