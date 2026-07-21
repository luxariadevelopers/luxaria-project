# Site Quality — Integration Checklist (Phase 5 / W6)

**Do not overload GRN `quality-inspections`.** This module is site workmanship QC only.

Permissions used (add to RBAC catalog + role seeds when wiring):

| Permission | Usage |
|------------|--------|
| `site_quality.view` | List / get |
| `site_quality.manage` | Create, update, raise NCR, punch list, rectify, reinspect, cancel |
| `site_quality.close` | Close after pass or re-inspection |

## Backend registration

1. **App module** — import and register:

```ts
import { SiteQualityModule } from './modules/site-quality';

@Module({
  imports: [
    // ...
    SiteQualityModule,
  ],
})
export class AppModule {}
```

2. **RBAC** — `apps/backend/src/modules/rbac/permissions.catalog.ts`:

```ts
'site_quality.view',
'site_quality.manage',
'site_quality.close',
```

Seed onto `SITE_ENGINEER` (view + manage), PM / SE lead (view + manage + close), Director (view + close) as appropriate.

3. **DPR link (optional later)** — expose `qualityObservationIds` on DPR pointing at `site_quality` document ids.

## Web registration

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx`):

```tsx
{ path: 'site-quality', element: <SiteQualityPage /> }
```

2. Navigation — under Project Control / Site Execution, label **Site Quality**, permission `site_quality.view`.

3. Page + API already live at:

- `apps/web/src/site-quality/api.ts`
- `apps/web/src/site-quality/SiteQualityPage.tsx`

## API surface

| Method | Path | Permission |
|--------|------|------------|
| POST | `/site-quality` | manage |
| GET | `/site-quality` | view |
| GET | `/site-quality/:id` | view |
| PATCH | `/site-quality/:id` | manage |
| POST | `/site-quality/:id/raise-ncr` | manage |
| POST | `/site-quality/:id/punch-list` | manage |
| POST | `/site-quality/:id/rectify` | manage |
| POST | `/site-quality/:id/reinspect` | manage |
| POST | `/site-quality/:id/close` | close |
| POST | `/site-quality/:id/cancel` | manage |

Workflow: `inspection → ncr → punch_list → rectification → re_inspection → closed` (pass close also allowed from `inspection`).
