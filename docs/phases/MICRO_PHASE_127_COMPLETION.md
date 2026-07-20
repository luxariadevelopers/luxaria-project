# Micro Phase 127 — Stock Count (mobile) — Completion Report

**Scope:** Mobile only — capture physical counts with photos, offline create + submit.  
**Branch / worktree:** `micro-phase-127-stock-count`  
**Nest permissions used (catalog):** `stock.view` (list/get), `stock.adjust` (create/submit).  
Prompt aliases `stock_count.create` / `stock_count.submit` are **not** in the Nest catalog.

## Delivered

| Item | Location |
|------|----------|
| Stock Count list screen | `apps/mobile/src/screens/StockCountListScreen.tsx` |
| Count entry screen (FlatList, large lists) | `apps/mobile/src/screens/StockCountEntryScreen.tsx` |
| Material row UI (system / physical / reason / photo) | `apps/mobile/src/stock-count/MaterialCountRow.tsx` |
| API client (existing Nest paths only) | `apps/mobile/src/stock-count/api.ts` |
| Offline enqueue + photo merge | `buildStockCountOfflineEnqueue.ts`, `mergeItemPhotos.ts` |
| Draft persistence (AsyncStorage) | `apps/mobile/src/stock-count/draftStore.ts` |
| Nav: Home › Stock Count | `HomeScreen.tsx`, `RootNavigator.tsx` |
| Transport create → submit | `apps/mobile/src/offline/transport.ts` |
| Matrix update | `docs/ui-api-matrix.md` |

## Acceptance

- Storekeepers with `stock.adjust` can capture a full physical count offline (draft persisted), queue create + submit with evidence photos; sync uploads media, `POST /stock-counts`, then `POST /stock-counts/:id/submit`.
- Variance without reason is blocked client-side (mirrors Nest rule).
- Loading / empty / error / 403 / retry covered on list and entry.
- Tests cover large-list draft persistence and offline enqueue/sync path.

## Verification

```bash
pnpm --filter @luxaria/shared-types build
pnpm --filter @luxaria/mobile typecheck   # pass
pnpm --filter @luxaria/mobile lint        # pass
pnpm --filter @luxaria/mobile test -- --testPathPattern=stock-count  # 13 pass
```

## Out of scope

- Review / approve / post / cancel UI  
- Web changes  
- Nest API changes  

