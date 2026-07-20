# Stock Reorder & Forecasting API — Luxaria Developers ERP

Base path: `/api/v1/stock-reorder`  
Swagger tag: **Stock Reorder**

## Permissions

| Permission | Usage |
|------------|--------|
| `stock.view` | Forecast + list alerts |
| `stock.adjust` | Trigger evaluation job |

## Metrics (per project + material)

| Field | Meaning |
|-------|---------|
| `availableStock` | Sum of on-hand balances (all locations, base unit) |
| `pendingPoQuantity` | Unreceived qty on `issued` / `partially_received` POs (base unit) |
| `averageDailyConsumption` | Net consumption over lookback ÷ days |
| `estimatedStockOutDate` | `asOf + (available + pending PO) / avg daily` |
| `reorderLevel` | From material master |
| `recommendedPurchaseQuantity` | Gap to `maximumStock` (or `reorderLevel` if max unset) |

## Alerts

- `below_reorder_level`
- `below_minimum_level`
- `expected_stockout_within_days` (default ≤ 3 days)
- `no_open_purchase_order` (needs replenishment and pending PO = 0)
- `excess_stock`
- `slow_moving_stock`

## Endpoints

| Method | Path |
|--------|------|
| `GET` | `/stock-reorder/forecast?projectId=` |
| `GET` | `/stock-reorder/alerts` |
| `POST` | `/stock-reorder/evaluate` |

## Background jobs

- `@nestjs/schedule` cron (`STOCK_REORDER_CRON`, default `0 6 * * *`)
- When `REDIS_ENABLED=true`, evaluation is enqueued on BullMQ queue `stock-reorder`
- When Redis is off, the cron/API runs evaluation **inline**

## Env

| Variable | Default |
|----------|---------|
| `STOCK_FORECAST_LOOKBACK_DAYS` | `30` |
| `STOCK_STOCKOUT_ALERT_DAYS` | `3` |
| `STOCK_SLOW_MOVING_DAYS` | `45` |
| `STOCK_REORDER_JOBS_ENABLED` | `true` |
| `STOCK_REORDER_CRON` | `0 6 * * *` |
| `REDIS_ENABLED` | `false` |
| `REDIS_HOST` | `127.0.0.1` |
| `REDIS_PORT` | `9018` |

Local Redis: `docker compose up -d redis`
