# MongoDB Atlas configuration — Luxaria Developers ERP

The backend connects with **Mongoose** using the `MONGODB_URI` environment variable. Local Docker Mongo (`:9017`) is fine for development; production and shared staging should use **MongoDB Atlas**.

## Required Atlas setup

1. Create a project and an **M10+** cluster is recommended for production (M0 free tier works for early development).
2. Create a database user with least privilege (read/write to the Luxaria database only).
3. Network access:
   - Development: allow your current IP
   - Production: allow only application host / VPC peering / private endpoint
4. Create (or let the app create) database name e.g. `luxaria-erp`.
5. Copy the connection string (**Drivers** → Node.js) and set:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/luxaria-erp?retryWrites=true&w=majority
```

Never commit real credentials. Use secrets managers or local `.env` files (gitignored).

## Driver options used by the backend

| Option | Value | Purpose |
|--------|-------|---------|
| `retryWrites` | `true` | Retry safe writes on transient Atlas errors |
| `retryReads` | `true` | Retry reads on transient errors |
| `serverSelectionTimeoutMS` | `10000` | Fail fast if cluster unreachable |
| `maxPoolSize` / `minPoolSize` | `10` / `1` | Connection pool |
| `autoIndex` | off in production | Avoid runtime index builds in prod |

Successful connections are logged with a **masked** URI (`user` / password → `***`).

## Health endpoint

`GET /api/v1/health` includes:

```json
"database": {
  "status": "up",
  "readyState": 1,
  "readyStateLabel": "connected",
  "host": "...",
  "name": "luxaria-erp",
  "maskedUri": "mongodb+srv://***:***@cluster0.xxx.mongodb.net/luxaria-erp?..."
}
```

## Transactions

Atlas replica sets support multi-document transactions. Use:

```ts
await databaseService.withTransaction(async (session) => {
  // pass { session } into model operations
});
```

Local Docker standalone Mongo does **not** support transactions. Use Atlas, or a replica-set local setup, when testing transaction-heavy flows.

## Base document fields (all business collections)

Apply `baseSchemaPlugin` + `softDeletePlugin` to every domain schema:

| Field | Notes |
|-------|-------|
| `createdAt` / `updatedAt` | Mongoose timestamps |
| `createdBy` / `updatedBy` | ObjectId refs (User) |
| `isDeleted` | Soft-delete flag (indexed) |
| `deletedAt` / `deletedBy` | Soft-delete audit |

Default queries exclude soft-deleted documents. Use `{ withDeleted: true }` to include them.

## Idempotency keys

Collection: `idempotency_keys`

- Unique compound index: `(key, scope)`
- TTL index on `expiresAt`
- Statuses: `processing` | `completed` | `failed`

Use this for financial and offline mobile submissions so retries do not create duplicates.

## Suggested Atlas indexes (ops)

After deploying domain modules, review Atlas Performance Advisor. At minimum, business collections inherit audit indexes from `baseSchemaPlugin`:

- `{ isDeleted: 1, createdAt: -1 }`
- `{ createdBy: 1, createdAt: -1 }`
- `{ updatedBy: 1, updatedAt: -1 }`
- `{ isDeleted: 1, deletedAt: -1 }`

## Local vs Atlas quick switch

```bash
# Local Docker
MONGODB_URI=mongodb://127.0.0.1:9017/luxaria-erp

# Atlas
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/luxaria-erp?retryWrites=true&w=majority
```

Restart the API after changing `MONGODB_URI`.
