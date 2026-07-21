import { normalizeMilestoneCode } from './payment-schedules.validation';

describe('construction milestone codes', () => {
  it('normalizes codes to lowercase snake_case', () => {
    expect(normalizeMilestoneCode('Foundation')).toBe('foundation');
    expect(normalizeMilestoneCode('floor complete')).toBe('floor_complete');
    expect(normalizeMilestoneCode('  ROOF  ')).toBe('roof');
    expect(normalizeMilestoneCode(null)).toBeNull();
    expect(normalizeMilestoneCode('')).toBeNull();
  });
});
