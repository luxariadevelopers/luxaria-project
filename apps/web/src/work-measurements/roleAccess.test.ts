import { describe, expect, it } from 'vitest';
import {
  canVerifyMeasurement,
  resolveWorkMeasurementCapabilities,
} from './roleAccess';

describe('resolveWorkMeasurementCapabilities', () => {
  it('maps Nest measurement.* codes (not work_measurement.* aliases)', () => {
    const caps = resolveWorkMeasurementCapabilities((code) =>
      ['measurement.view', 'measurement.create', 'measurement.certify'].includes(
        code,
      ),
    );
    expect(caps).toEqual({
      canView: true,
      canCreate: true,
      canUpdate: true,
      canSubmit: true,
      canVerify: true,
      canReject: true,
      canCancel: true,
      canViewBoq: false,
      canViewContractors: false,
    });
  });
});

describe('canVerifyMeasurement', () => {
  it('blocks self-verification when measuredBy equals current user', () => {
    const caps = resolveWorkMeasurementCapabilities((code) =>
      code === 'measurement.certify',
    );
    expect(canVerifyMeasurement(caps, 'user-a', 'user-a')).toBe(false);
    expect(canVerifyMeasurement(caps, 'user-a', 'user-b')).toBe(true);
  });
});
