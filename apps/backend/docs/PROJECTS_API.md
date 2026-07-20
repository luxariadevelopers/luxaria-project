# Projects API — Luxaria Developers ERP

Base path: `/api/v1/projects`  
Auth: Bearer access token required  
Swagger tag: **Projects**

## Permissions

| Permission | Use |
|------------|-----|
| `project.create` | Create |
| `project.view` | List / view / documents list |
| `project.update` | Update, assign PM/directors, status (non-close) |
| `project.close` | Status → Closed or Cancelled |
| `project.upload_document` | Upload documents |

Project-level access is also enforced via `@RequireProjectAccess` / assignment records.

## Statuses

Planning → Approval → Pre-Construction → Construction → Completed → Closed  
Also: On Hold, Cancelled (terminal).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects` | Create (`projectCode` auto via numbering `PRJ-YYYY-####`) |
| GET | `/projects` | List / filter (access-scoped) |
| GET | `/projects/:id` | View |
| PATCH | `/projects/:id` | Update |
| POST | `/projects/:id/project-manager` | Assign PM |
| POST | `/projects/:id/directors` | Assign directors (replace) |
| POST | `/projects/:id/status` | Update status |
| POST | `/projects/:id/documents` | Upload document (`multipart` field `file`) |
| GET | `/projects/:id/documents` | List documents |

## List filters

`search`, `status`, `projectType`, `projectStage`, `projectManagerId`, `directorId`, `companyId`, pagination/sort.

## Create body (example)

```json
{
  "projectName": "Luxaria Heights",
  "projectType": "residential",
  "address": {
    "line1": "OMR",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600119",
    "country": "India"
  },
  "startDate": "2026-04-01",
  "expectedCompletionDate": "2028-03-31",
  "landArea": 50000,
  "numberOfUnits": 120,
  "projectManager": "<userId>",
  "assignedDirectors": ["<userId>"],
  "approvedBudget": 250000000,
  "reraDetails": {
    "reraNumber": "TN/Building/0123/2026",
    "authority": "TNRERA"
  }
}
```
