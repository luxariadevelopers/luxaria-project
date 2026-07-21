# Site Safety (HSE) — Integration Checklist (Phase 5 / W6)

First-class HSE events — separate from site quality and GRN QC.

Permissions used (add to RBAC catalog + role seeds when wiring):

| Permission | Usage |
|------------|--------|
| `safety.view` | List / get |
| `safety.manage` | Create, update, investigate, close |

## Backend registration

1. **App module** — import and register:

```ts
import { SiteSafetyModule } from './modules/site-safety';

@Module({
  imports: [
    // ...
    SiteSafetyModule,
  ],
})
export class AppModule {}
```

2. **RBAC** — `apps/backend/src/modules/rbac/permissions.catalog.ts`:

```ts
'safety.view',
'safety.manage',
```

Seed onto `SITE_ENGINEER` (view + manage), PM / HSE lead, Director (view) as appropriate.

3. **DPR link (optional later)** — expose `safetyIncidentIds` on DPR pointing at `site_safety` document ids.

4. **Site issues hook (optional later)** — critical severity may auto-open `site-issues`.

## Web registration

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx`):

```tsx
{ path: 'site-safety', element: <SiteSafetyPage /> }
```

2. Navigation — under Project Control / Site Execution, label **Site Safety / HSE**, permission `safety.view`.

3. Page + API already live at:

- `apps/web/src/site-safety/api.ts`
- `apps/web/src/site-safety/SiteSafetyPage.tsx`

## API surface

| Method | Path | Permission |
|--------|------|------------|
| POST | `/site-safety` | manage |
| GET | `/site-safety` | view |
| GET | `/site-safety/:id` | view |
| PATCH | `/site-safety/:id` | manage |
| POST | `/site-safety/:id/investigate` | manage |
| POST | `/site-safety/:id/close` | manage |

Types: `near_miss` | `accident` | `ppe` | `toolbox_talk` | `safety_inspection`  
Status: `open` → `investigating` → `closed`
