import { describe, expect, it } from 'vitest';
import { resolveManpowerShortfallCapabilities } from './roleAccess';

describe('resolveManpowerShortfallCapabilities', () => {
  it('maps Nest manpower_shortfall.view', () => {
    const caps = resolveManpowerShortfallCapabilities(
      (code) => code === 'manpower_shortfall.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canEscalate).toBe(false);
  });

  it('maps escalate to manpower_shortfall.acknowledge', () => {
    const caps = resolveManpowerShortfallCapabilities((code) =>
      [
        'manpower_shortfall.view',
        'manpower_shortfall.acknowledge',
        'manpower_plan.view',
      ].includes(code),
    );
    expect(caps.canAcknowledge).toBe(true);
    expect(caps.canEscalate).toBe(true);
    expect(caps.canCompare).toBe(true);
  });
});
