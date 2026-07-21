# Manage Project and Site Access

## Project access

- Per-project UI: **Projects → [project] → Access** (`project_access.*`)
- Assignments support start/end dates and global access (use sparingly)

## Site access

1. Ensure sites exist under the project (**Sites** API / create from employee wizard).
2. Open **Administration → Site Access** to list/revoke assignments.
3. Provisioning a Site Engineer creates both project and site assignment together.

## Rules

- Permission without project assignment → denied  
- Project assignment without permission → denied  
- Site-scoped users cannot use another site on the same project  
- Users with project assignment but no site rows remain project-wide (legacy)  
