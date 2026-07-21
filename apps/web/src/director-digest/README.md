# Daily director digest (web)

Preview and send the Nest daily director digest for directors and admins.

## Route choice

**Path:** `/administration/director-digest`  
**Nav group:** `administration`  
**Project scope:** `none` (global)

Reports nav is accounting-focused (cash book, bank book). Director digest is an executive notification workflow — grouped with audit logs and system health.

## Nest API

Base: `/director-digest`

| Action | Method | Permission |
|--------|--------|------------|
| Preview (self) | GET `/preview` | `director_digest.view` |
| Preview all | GET `/preview-all` | `director_digest.send` |
| Send | POST `/send` | `director_digest.send` |
| Run job | POST `/run` | `director_digest.send` |

## Wiring (manual)

Add to `routeRegistry.ts`, `routeElements.tsx`, and `routes/index.tsx` — see parent task wiring instructions.
