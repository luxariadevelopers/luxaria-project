# Unit Registrations — CRM Integration Checklist

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Purpose

Track sub-registrar (SRO) registration of sold units: draft → submitted → registered, with optional links to sale agreements and soft booking/unit status sync.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `registration.view` | List / get |
| `registration.manage` | Create, update draft, submit, mark-registered, cancel |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'registration.view',
'registration.manage',
```

Suggested seeds: CRM / Registration desk (view + manage), Sales (view).

## Backend registration

1. **App module** — import `UnitRegistrationsModule` from `./modules/unit-registrations`.
2. **Resource ownership** (project-access):

```ts
'unit-registration': {
  model: UnitRegistration.name,
  projectField: 'projectId',
},
```

## API surface — unit-registrations

| Method | Path | Permission |
|--------|------|------------|
| POST | `/unit-registrations` | manage |
| GET | `/unit-registrations` | view |
| GET | `/unit-registrations/:id` | view |
| PATCH | `/unit-registrations/:id` | manage |
| POST | `/unit-registrations/:id/submit` | manage |
| POST | `/unit-registrations/:id/mark-registered` | manage |
| POST | `/unit-registrations/:id/cancel` | manage |

### Workflow

`draft → submitted → registered`  
Cancel: `draft | submitted → cancelled`

### Booking / unit integration (soft)

On **mark-registered**, if models are available:
- Booking → `BookingStatus.Registered`
- Unit → `UnitStatus.Registered`

Failures are swallowed so the module works standalone.

## Module path

```
apps/backend/src/modules/unit-registrations/
```

## Out of scope (later)

- Document upload service integration (`documentPath`)
- Stamp duty / registration fee GL posting
- EC (encumbrance certificate) verification workflow
