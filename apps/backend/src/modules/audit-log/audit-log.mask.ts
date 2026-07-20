const MASK = '********';

/** Exact / suffix-insensitive sensitive key names (compared lowercased). */
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
    // Keep last 4 for recognizability on account-like values
    return `${MASK}${value.slice(-4)}`;
  }
  return MASK;
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

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, depth + 1));
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    // ObjectId / Buffer-like
    if (
      typeof (value as { toHexString?: () => string }).toHexString === 'function'
    ) {
      return String(value);
    }

    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (isSensitiveKey(key)) {
        out[key] = maskScalar(child);
      } else {
        out[key] = maskValue(child, depth + 1);
      }
    }
    return out;
  }

  return value;
}
