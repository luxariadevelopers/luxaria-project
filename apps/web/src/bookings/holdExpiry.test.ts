import { describe, expect, it } from 'vitest';
import { describeHoldExpiry, isExpiredOrLapsedHold } from './holdExpiry';
import { BookingStatus } from './types';

const NOW = new Date('2026-07-20T12:00:00.000Z');

describe('describeHoldExpiry', () => {
  it('marks terminal expired status clearly', () => {
    const display = describeHoldExpiry({
      status: BookingStatus.Expired,
      holdExpiresAt: null,
      expiredAt: '2026-07-19T10:00:00.000Z',
      now: NOW,
    });
    expect(display.tone).toBe('expired');
    expect(display.label).toMatch(/Expired/i);
    expect(isExpiredOrLapsedHold(display)).toBe(true);
  });

  it('flags lapsed holds still in hold status past expiry', () => {
    const display = describeHoldExpiry({
      status: BookingStatus.Hold,
      holdExpiresAt: '2026-07-20T08:00:00.000Z',
      now: NOW,
    });
    expect(display.tone).toBe('lapsed');
    expect(display.label).toMatch(/Lapsed/i);
    expect(isExpiredOrLapsedHold(display)).toBe(true);
  });

  it('flags pending_approval holds past expiry as lapsed', () => {
    const display = describeHoldExpiry({
      status: BookingStatus.PendingApproval,
      holdExpiresAt: '2026-07-19T00:00:00.000Z',
      now: NOW,
    });
    expect(display.tone).toBe('lapsed');
  });

  it('marks hold without holdExpiresAt as invalid', () => {
    const display = describeHoldExpiry({
      status: BookingStatus.Hold,
      holdExpiresAt: null,
      now: NOW,
    });
    expect(display.tone).toBe('invalid');
    expect(display.label).toMatch(/No expiry/i);
  });

  it('shows active hold expiry when still valid', () => {
    const display = describeHoldExpiry({
      status: BookingStatus.Hold,
      holdExpiresAt: '2026-07-21T12:00:00.000Z',
      now: NOW,
    });
    expect(display.tone).toBe('active');
    expect(isExpiredOrLapsedHold(display)).toBe(false);
  });

  it('hides expiry for non-hold workflow statuses', () => {
    const display = describeHoldExpiry({
      status: BookingStatus.Booked,
      holdExpiresAt: null,
      now: NOW,
    });
    expect(display.tone).toBe('none');
    expect(display.label).toBe('—');
  });
});
