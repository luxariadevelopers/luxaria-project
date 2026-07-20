const SCRIPT_BLOCK =
  /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
const DANGEROUS_TAG =
  /<\s*\/?\s*(iframe|object|embed|link|style|meta|svg|math)\b[^>]*>/gi;
const EVENT_HANDLER = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI = /javascript\s*:/gi;

/**
 * Lightweight string sanitizer for JSON APIs (not a full HTML sanitizer).
 * Strips script blocks, dangerous tags, event handlers, and javascript: URIs
 * without rewriting legitimate text that uses angle brackets (e.g. "qty < 10").
 */
export function sanitizeString(input: string): string {
  return input
    .replace(SCRIPT_BLOCK, '')
    .replace(DANGEROUS_TAG, '')
    .replace(EVENT_HANDLER, '')
    .replace(JAVASCRIPT_URI, '');
}

export function sanitizeObjectDeep<T>(value: T, depth = 0): T {
  if (depth > 12 || value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectDeep(item, depth + 1)) as T;
  }

  if (typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input)) {
      output[key] = sanitizeObjectDeep(nested, depth + 1);
    }
    return output as T;
  }

  return value;
}
