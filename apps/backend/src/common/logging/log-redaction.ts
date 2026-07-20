const SENSITIVE_KEY_PATTERN =
  /^(password|passwd|secret|token|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|jwt|bearer|cookie|session|credential|private[_-]?key|field[_-]?encryption[_-]?key|mongodb[_-]?uri|email|phone|mobile)$/i;

const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi;

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{2,4}\)|\d{2,4})[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g;

const MONGO_URI_PATTERN =
  /mongodb(?:\+srv)?:\/\/[^/\s]+/gi;

const KEY_VALUE_SECRET_PATTERN =
  /((?:password|secret|token|api[_-]?key|authorization)\s*[:=]\s*)([^\s,&"']+)/gi;

export const REDACTED = '[REDACTED]';

export function redactString(value: string): string {
  if (!value) {
    return value;
  }

  return value
    .replace(MONGO_URI_PATTERN, (uri) => maskMongoUriInString(uri))
    .replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED}`)
    .replace(JWT_PATTERN, REDACTED)
    .replace(KEY_VALUE_SECRET_PATTERN, `$1${REDACTED}`)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(PHONE_PATTERN, REDACTED);
}

function maskMongoUriInString(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return uri.replace(/\/\/([^:/@]+)(:[^@]*)?@/, '//***:***@');
  }
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key.trim());
}

export function redactValue(value: unknown, key?: string): unknown {
  if (key && isSensitiveKey(key)) {
    return REDACTED;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === 'object') {
    return redactObject(value as Record<string, unknown>);
  }

  return value;
}

export function redactObject<T extends Record<string, unknown>>(value: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    result[key] = redactValue(entry, key);
  }

  return result as T;
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return REDACTED;
  }

  return `${trimmed.slice(0, 4)}${REDACTED}${trimmed.slice(-4)}`;
}
