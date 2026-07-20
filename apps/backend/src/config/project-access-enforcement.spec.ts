describe('PROJECT_ACCESS_ENFORCEMENT defaults', () => {
  const resolveMode = (raw: string | undefined): 'enforce' | 'observe' =>
    String(raw ?? 'enforce')
      .trim()
      .toLowerCase() === 'observe'
      ? 'observe'
      : 'enforce';

  it('defaults to enforce when unset (production-safe)', () => {
    expect(resolveMode(undefined)).toBe('enforce');
    expect(resolveMode('')).toBe('enforce');
    expect(resolveMode('ENFORCE')).toBe('enforce');
    expect(resolveMode('typo')).toBe('enforce');
  });

  it('accepts observe only when explicitly configured', () => {
    expect(resolveMode('observe')).toBe('observe');
    expect(resolveMode(' OBSERVE ')).toBe('observe');
  });

  it('configuration factory uses the same default', () => {
    // Mirror apps/backend/src/config/configuration.ts projectAccessEnforcement
    const original = process.env.PROJECT_ACCESS_ENFORCEMENT;
    try {
      delete process.env.PROJECT_ACCESS_ENFORCEMENT;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const configuration = require('./configuration').default as () => {
        projectAccessEnforcement: 'enforce' | 'observe';
      };
      expect(configuration().projectAccessEnforcement).toBe('enforce');
    } finally {
      if (original === undefined) {
        delete process.env.PROJECT_ACCESS_ENFORCEMENT;
      } else {
        process.env.PROJECT_ACCESS_ENFORCEMENT = original;
      }
    }
  });
});
