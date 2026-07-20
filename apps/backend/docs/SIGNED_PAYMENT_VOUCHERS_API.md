# Signed Payment Vouchers API — Luxaria Developers ERP

Base path: `/api/v1/signed-payment-vouchers`  
Auth: Bearer access token  
Swagger tag: **Signed Payment Vouchers**

Labour and cash-payment vouchers with digital signatures stored in private S3, checksum binding, and generated PDF vouchers.

## Workflow

`draft` → `submitted` → `approved` → `posted` → `reversed`

Also: `returned` · `cancelled`

## Capture fields

| Field | Notes |
|-------|--------|
| `recipientName` / `recipientMobile` | Payee |
| `workDescription` | Work / purpose |
| `grossAmount` / `deductions` / `netAmount` | `net = gross − deductions` |
| `recipientSignatureDocumentId` + checksum | S3 image |
| `engineerSignatureDocumentId` + checksum | S3 image |
| `witnessSignature*` | When `requiresWitnessSignature` |
| `recipientPhoto*` | When `requiresRecipientPhoto` |
| `latitude` / `longitude` | GPS |
| `capturedAt` | Date/time |
| `deviceId` | Device |
| `voucherPdfDocumentId` + checksum | Generated on approve |

## Signature upload flow

1. Create voucher draft → get `id`
2. `POST /documents/presign-upload` with:
   - `module`: `signed_payment_vouchers`
   - `entityType`: `payment_voucher`
   - `entityId`: voucher id
   - `documentType`: `recipient_signature` \| `engineer_signature` \| `witness_signature` \| `recipient_photo`
3. Client PUT to S3 → `POST /documents/:id/confirm-upload` (optional client checksum)
4. `POST /signed-payment-vouchers/:id/signatures` with document ids — **stores SHA-256 checksums on the voucher**

## Rules

1. Signatures stored in **S3** via Documents module
2. **Checksum** copied from `StoredDocument.checksum` at attach time
3. **PDF voucher** generated on approve and uploaded to S3 (`documentType: voucher_pdf`)
4. **No signature replacement after approval**
5. **Reverse** posted vouchers (journal reverse) and optionally create a **replacement draft** (new signatures required)

## Permissions

| Permission | Use |
|------------|-----|
| `payment.view` | List / get |
| `payment.release` | Create, update, attach signatures, submit, cancel |
| `payment.approve` | Approve, post, reverse |

## Endpoints

| Method | Path | Action |
|--------|------|--------|
| `POST` | `/signed-payment-vouchers` | Create draft |
| `PATCH` | `/:id` | Update draft |
| `POST` | `/:id/signatures` | Attach S3 docs + checksums |
| `POST` | `/:id/submit` | Submit |
| `POST` | `/:id/approve` | Approve + PDF |
| `POST` | `/:id/post` | Post journal |
| `POST` | `/:id/reverse` | Reverse + optional replacement |
| `POST` | `/:id/cancel` | Cancel |
