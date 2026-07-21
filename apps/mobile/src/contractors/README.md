# Contractor — Mobile (Phase 6)

## Shipped

| Capability | Location | Notes |
|------------|----------|--------|
| Work order list | `apps/mobile/src/work-orders/` + `WorkOrderListScreen` | Online; `work_order.view`; Home tile |
| Measurement list / create / offline enqueue | `apps/mobile/src/work-measurement/` | Capture can run offline |
| Measurement acknowledge (verify) | List row → `acknowledgeWorkMeasurement` | Online only; `measurement.certify` |

## Deferred

| Capability | Reason | When |
|------------|--------|------|
| Offline enqueue for measurement ack | Engineer SoD; queue type not required for Phase 6 close | Later polish |
| RA bill tracking screens | Commercial flow web-first | Optional |
| Contractor compliance / dashboard | Web pages in W9 | Optional |

## Permissions

- `work_order.view` — WO list
- `measurement.view` / `measurement.create` — capture
- `measurement.certify` — acknowledge / verify on list
- `contractor.view` — contractor picker
