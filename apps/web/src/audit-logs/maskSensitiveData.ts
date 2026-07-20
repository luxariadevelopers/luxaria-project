/**
 * Mirrors `apps/backend/src/modules/audit-log/audit-log.mask.ts`.
 * Defensive client mask — never invents new sensitive keys beyond Nest.
 */

const MASK = '********';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authorization',
  'auth',
  'apikey',
  'apisecret',
  'secret',
  'clientsecret',
  'privatekey',
  'sessiontoken',
  'otp',
  'pin',
  'cvv',
  'cvc',
  'accountnumber',
  'account_number',
  'accountnumberencrypted',
  'account_number_encrypted',
  'bankaccountnumber',
  'iban',
  'cardnumber',
  'pan',
]);

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  const n = normalizeKey(key);
  if (SENSITIVE_KEYS.has(n)) return true;
  if (n.endsWith('password') || n.endsWith('token') || n.endsWith('secret')) {
    return true;
  }
  if (n.includes('accountnumber') && !n.endsWith('last4')) {
    return true;
  }
  return false;
}

function maskScalar(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length <= 4) return MASK;
    return `${MASK}${value.slice(-4)}`;
  }
  return MASK;
}

/** True when a value already looks backend-masked — never rehydrate. */
export function isMaskedAuditValue(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(MASK);
}

/**
 * Deep-clone and mask passwords, tokens, and sensitive bank fields.
 * Safe for audit beforeData / afterData payloads.
 */
export function maskSensitiveData<T>(input: T): T {
  return maskValue(input, 0) as T;
}

function maskValue(value: unknown, depth: number): unknown {
  if (value == null || depth > 20) return value;

  // Already masked by Nest — leave opaque; do not attempt to reverse.
  if (isMaskedAuditValue(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, depth + 1));
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (isSensitiveKey(key)) {
        out[key] = isMaskedAuditValue(child) ? child : maskScalar(child);
      } else {
        out[key] = maskValue(child, depth + 1);
      }
    }
    return out;
  }

  return value;
}
