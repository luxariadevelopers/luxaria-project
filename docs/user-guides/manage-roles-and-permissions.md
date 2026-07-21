# Manage Roles and Permissions

1. Open **Administration → Roles & Permissions**.
2. Create or clone a role, or edit an existing non-protected role.
3. Use the permission checklist (module groups) to grant actions.
4. Assign roles to users from **Organisation → Users** or the role assignment panel.
5. For exceptions, use permission overrides (`permission.override.manage`) — **deny always wins** over role allow.
6. System roles (e.g. `SITE_ENGINEER`) cannot be deleted; review their seeded permissions carefully.

Effective access = active role permissions ∪ timed allows − timed denies, then restricted by project/site assignment.
