import { describe, expect, it } from 'vitest';
import { resolveReorderAlertCapabilities } from './roleAccess';

describe('resolveReorderAlertCapabilities', () => {
  it('maps Nest stock.view (not stock_forecast.view)', () => {
    const caps = resolveReorderAlertCapabilities(
      (code) => code === 'stock.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canEvaluate).toBe(false);
  });

  it('allows evaluate with stock.adjust', () => {
    const caps = resolveReorderAlertCapabilities((code) =>
      ['stock.view', 'stock.adjust'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canEvaluate).toBe(true);
  });
});
