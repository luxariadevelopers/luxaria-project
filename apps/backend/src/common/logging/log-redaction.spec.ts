import {
  REDACTED,
  isSensitiveKey,
  maskSecret,
  redactObject,
  redactString,
} from './log-redaction';

describe('log-redaction', () => {
  describe('redactString', () => {
    it('redacts email addresses', () => {
      expect(redactString('user login failed for admin@luxaria.com')).toBe(
        `user login failed for ${REDACTED}`,
      );
    });

    it('redacts bearer tokens and JWTs', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(redactString(`Authorization Bearer ${jwt}`)).toBe(
        `Authorization Bearer ${REDACTED}`,
      );
      expect(redactString(jwt)).toBe(REDACTED);
    });

    it('redacts password key=value pairs', () => {
      expect(redactString('login password=SuperSecret123! failed')).toBe(
        `login password=${REDACTED} failed`,
      );
    });

    it('masks MongoDB URIs with credentials', () => {
      expect(
        redactString(
          'connected mongodb+srv://admin:secret@cluster0.example.net/luxaria',
        ),
      ).toBe('connected mongodb+srv://***:***@cluster0.example.net/luxaria');
    });
  });

  describe('redactObject', () => {
    it('redacts sensitive keys recursively', () => {
      const input = {
        email: 'ops@luxaria.com',
        password: 'plain-text',
        profile: {
          phone: '+91 98765 43210',
          token: 'abc123',
        },
      };

      expect(redactObject(input)).toEqual({
        email: REDACTED,
        password: REDACTED,
        profile: {
          phone: REDACTED,
          token: REDACTED,
        },
      });
    });
  });

  describe('isSensitiveKey', () => {
    it('matches common secret field names', () => {
      expect(isSensitiveKey('refreshToken')).toBe(true);
      expect(isSensitiveKey('api_key')).toBe(true);
      expect(isSensitiveKey('displayName')).toBe(false);
    });
  });

  describe('maskSecret', () => {
    it('returns null for empty values', () => {
      expect(maskSecret('')).toBeNull();
      expect(maskSecret(undefined)).toBeNull();
    });

    it('masks long secrets with prefix and suffix', () => {
      expect(maskSecret('sk_live_abcdefghijklmnop')).toBe(
        `sk_l${REDACTED}mnop`,
      );
    });
  });
});
