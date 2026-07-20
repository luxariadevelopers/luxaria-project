import {
  accountNumberLast4,
  decryptSensitive,
  encryptSensitive,
  generateOpaqueToken,
  hashPassword,
  hashToken,
  isEncryptedSensitive,
  verifyPassword,
} from './crypto.util';

describe('crypto.util', () => {
  it('hashes and verifies passwords with argon2', async () => {
    const hash = await hashPassword('ChangeMe123!');
    expect(hash).not.toContain('ChangeMe123!');
    await expect(verifyPassword(hash, 'ChangeMe123!')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('hashes tokens one-way', () => {
    const token = generateOpaqueToken();
    const hashed = hashToken(token);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toEqual(token);
    expect(hashToken(token)).toEqual(hashed);
  });

  it('encrypts and decrypts sensitive bank fields', () => {
    const secret = 'luxaria-test-field-encryption-key';
    const plain = '123456789012';
    const encrypted = encryptSensitive(plain, secret);
    expect(isEncryptedSensitive(encrypted)).toBe(true);
    expect(encrypted).not.toContain(plain);
    expect(decryptSensitive(encrypted, secret)).toBe(plain);
    expect(accountNumberLast4(plain)).toBe('9012');
  });
});
