# Web documents (Micro Phases 009 + 029)

Private S3 document workflow and searchable library.

## Library (`/documents`) — Phase 029

Nav: **Administration → Documents** (`document.view`).

Nest `GET /documents` is **entity-scoped** (`entityType` + `entityId` required).
There is no global document index. The library page validates those filters,
lists permitted rows, and supports client-side search on the loaded page.

| Endpoint | Permission | Use |
|----------|------------|-----|
| `GET /documents?entityType=&entityId=` | `document.view` | Library list (+ optional `module`, `projectId`, `status`, pagination) |
| `GET /documents/:id` | `document.view` | Metadata |
| `GET /documents/:id/download-url` | `document.download` | Short-lived private GET URL |
| `POST /documents/:id/archive` | `document.archive` | Archive active document |

### Security rules

1. Never render `s3Key` in the library table or preview chrome.
2. Downloads use Nest presigned URLs only; refresh when `expiresIn` elapses.
3. Downloadable statuses (Nest): `active`, `replaced`.
4. Hiding buttons is not enough — route guard + 403 handling apply.

### Components

| Export | Role |
|--------|------|
| `DocumentTable` | DataTable + preview dialog + archive |
| `DocumentLibraryFilters` | Entity / module / project / status / search |
| `DocumentPreview` | Private URL preview with expiry refresh |
| `usePresignedDownload` | Cache + expiry + permission denial |
| `resolveDocumentEntityLink` | Shipped-route entity links (shared allow-list) |

## Upload workflow (Phase 009)

1. `POST /documents/presign-upload`
2. Client `PUT` to presigned URL (private bucket)
3. `POST /documents/:id/confirm-upload` → status `active`
4. Entity panels: `DocumentUploadPanel` / `DocumentListPanel`
5. Demo: `/dev/documents` (not in sidebar)

## Permissions

`document.view`, `document.upload`, `document.download`, `document.replace`,
`document.archive`
