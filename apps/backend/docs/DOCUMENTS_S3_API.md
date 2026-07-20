# Documents (AWS S3) API — Luxaria Developers ERP

Base path: `/api/v1/documents`  
Auth: Bearer access token required  
Swagger tag: **Documents (S3)**

## Security

1. **Private bucket only** — no public ACLs; access via short-lived presigned URLs
2. **MIME allowlist** enforced server-side
3. **Max file size** from `AWS_S3_MAX_UPLOAD_BYTES` (default 25MB)
4. **Checksum** stored on confirm (S3 SHA-256 when available)
5. **Extension derived from MIME** — client filename extension is never trusted
6. **No public object URLs** returned
7. **`malwareScanStatus`**: `pending` | `clean` | `infected` | `skipped` | `error`

## Flow

1. `POST /documents/presign-upload` → upload URL + document metadata (`pending_upload`)
2. Client `PUT` bytes to the presigned URL (private bucket)
3. `POST /documents/:id/confirm-upload` → `active`, checksum stored
4. `GET /documents/:id/download-url` → time-limited GET URL
5. `POST /documents/:id/replace` → new version + new upload URL (confirm activates & marks prior `replaced`)
6. `POST /documents/:id/archive` → `archived`
7. `GET /documents?entityType=&entityId=` → list entity documents

## Permissions

| Permission | Use |
|------------|-----|
| `document.upload` | Presign + confirm |
| `document.download` | Download URL |
| `document.replace` | Replace / version |
| `document.archive` | Archive |
| `document.view` | List / view metadata |

## Env

```
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_PREFIX=luxaria-developers/
AWS_S3_MAX_UPLOAD_BYTES=26214400
AWS_S3_PRESIGN_EXPIRES_SECONDS=900
```

Put secrets in `.env.development.local` (gitignored). Rotate keys if they were ever pasted into chat.
