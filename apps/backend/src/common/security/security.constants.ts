/** HttpOnly cookie holding the opaque refresh token (web clients). */
export const REFRESH_TOKEN_COOKIE = 'luxaria_refresh_token';

/** Safe image MIME types for logos / photos (SVG excluded — XSS vector). */
export const SAFE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

/** Spreadsheet / statement imports. */
export const STATEMENT_IMPORT_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/csv',
] as const;

export const DEV_SECRET_DEFAULTS = [
  'luxaria-dev-access-secret-change-me',
  'luxaria-dev-refresh-secret-change-me',
  'luxaria-dev-field-encryption-key-change-me-32b',
] as const;
