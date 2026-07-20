import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * Fails the build when any authenticated Nest handler lacks R-003 scope
 * classification or a project-scoped route lacks a resolution strategy.
 */
describe('R-003 route scope static validation', () => {
  it('classifies every controller handler and regenerates inventory CSV', () => {
    const script = path.resolve(
      __dirname,
      '../../../../../scripts/r003-scan-route-scopes.mjs',
    );
    const output = execFileSync(process.execPath, [script], {
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '../../../../../'),
    });
    const parsed = JSON.parse(output) as {
      handlers: number;
      violations: number;
      counts: Record<string, number>;
    };
    expect(parsed.handlers).toBeGreaterThan(100);
    expect(parsed.violations).toBe(0);
    expect(parsed.counts.unclassified ?? 0).toBe(0);
  });
});
