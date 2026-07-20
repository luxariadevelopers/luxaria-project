import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import * as argon2 from 'argon2';

const SENSITIVE_PREFIX = 'enc:v1:';
const AES_ALGORITHM = 'aes-256-gcm';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Opaque token for refresh / password-reset (returned to client once). */
export function generateOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Fast one-way hash for storing refresh/reset tokens (never store plain). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Derives a 32-byte AES key from the configured field-encryption secret.
 * Accepts a 64-char hex key, 44-char base64 (32 bytes), or any passphrase (scrypt).
 */
export function deriveFieldEncryptionKey(secret: string): Buffer {
  const trimmed = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  try {
    const asBase64 = Buffer.from(trimmed, 'base64');
    if (asBase64.length === 32) {
      return asBase64;
    }
  } catch {
    // fall through to scrypt
  }
  return scryptSync(trimmed, 'luxaria-field-encryption', 32);
}

/** Encrypt sensitive bank/PII strings at rest (AES-256-GCM). */
export function encryptSensitive(plainText: string, secret: string): string {
  const key = deriveFieldEncryptionKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${SENSITIVE_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

/** Decrypt values produced by encryptSensitive. */
export function decryptSensitive(payload: string, secret: string): string {
  if (!payload.startsWith(SENSITIVE_PREFIX)) {
    throw new Error('Invalid encrypted payload');
  }
  const parts = payload.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Invalid encrypted payload format');
  }
  const iv = Buffer.from(parts[2]!, 'base64url');
  const tag = Buffer.from(parts[3]!, 'base64url');
  const data = Buffer.from(parts[4]!, 'base64url');
  const key = deriveFieldEncryptionKey(secret);
  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function isEncryptedSensitive(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(SENSITIVE_PREFIX);
}

/** Last 4 digits for safe display / search (non-secret). */
export function accountNumberLast4(accountNumber: string): string {
  const digits = accountNumber.replace(/\s+/g, '');
  return digits.slice(-4);
}
