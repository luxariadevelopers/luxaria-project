/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Optional absolute base for Nest `uploads/…` filesystem PDFs (PO / receipts). */
  readonly VITE_UPLOADS_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
