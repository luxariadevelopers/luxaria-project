import { describe, expect, it } from '@jest/globals';
import { shouldForceChangePassword } from '../shouldForceChangePassword';

describe('shouldForceChangePassword', () => {
  it('returns false when not authenticated', () => {
    expect(
      shouldForceChangePassword(false, { mustChangePassword: true }),
    ).toBe(false);
  });

  it('returns false when authenticated without the flag', () => {
    expect(shouldForceChangePassword(true, null)).toBe(false);
    expect(shouldForceChangePassword(true, {})).toBe(false);
    expect(
      shouldForceChangePassword(true, { mustChangePassword: false }),
    ).toBe(false);
  });

  it('returns true when authenticated and mustChangePassword is set', () => {
    expect(
      shouldForceChangePassword(true, { mustChangePassword: true }),
    ).toBe(true);
  });
});
