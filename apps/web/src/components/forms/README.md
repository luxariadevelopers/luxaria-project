# Web form patterns (Micro Phase 008)

Reusable, accessible form building blocks for create/update screens.

## Components

| Component | Role |
|-----------|------|
| `FormSection` | Section + fieldset disable for permission/status locks |
| `FormTextField` / `FormSelect` / `FormCheckbox` | Existing RHF controls |
| `MoneyInput` | ₹ amount → `number` (`roundMoney`, 2 dp) |
| `DateInput` | `YYYY-MM-DD` (`isoDateOnlySchema`) |
| `AsyncSelect` | Async id picker (`SelectOption`) |
| `DocumentPicker` | Files with shared MIME / 100MB limits |
| `UnsavedChangesDialog` + `useUnsavedChangesGuard` | Dirty navigation block |

## Helpers

- `shapeCreatePayload` / `shapeUpdatePayload` — DTO shaping (no invented keys)
- `applyServerFieldErrors` / `applyApiFieldErrors` — map API `details` onto RHF
- `isFormEditable({ hasPermission, statusAllowsEdit })`
- `formDrawerPaperSx(width?)` — Drawer paper full-width on `xs`, fixed from `sm` (`slotProps.paper.sx`)

## Validation

Use Zod schemas from `@/validation` (`@luxaria/shared-validation`) with `zodResolver`.

## Demo

`/dev/forms` — not in the sidebar.
