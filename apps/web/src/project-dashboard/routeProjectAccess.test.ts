import { describe, expect, it } from 'vitest';
import { evaluateRouteProjectAccess } from './routeProjectAccess';

const P1 = '507f1f77bcf86cd799439011';
const P2 = '507f1f77bcf86cd799439012';

describe('evaluateRouteProjectAccess', () => {
  it('allows matching active + authorised project', () => {
    expect(
      evaluateRouteProjectAccess({
        routeProjectId: P1,
        selectedProjectId: P1,
        accessibleProjectIds: [P1, P2],
      }),
    ).toBe('ok');
  });

  it('rejects unauthorised project even if selected', () => {
    expect(
      evaluateRouteProjectAccess({
        routeProjectId: P1,
        selectedProjectId: P1,
        accessibleProjectIds: [P2],
      }),
    ).toBe('unauthorised');
  });

  it('detects active project mismatch', () => {
    expect(
      evaluateRouteProjectAccess({
        routeProjectId: P1,
        selectedProjectId: P2,
        accessibleProjectIds: [P1, P2],
      }),
    ).toBe('mismatch');
  });

  it('requires selection when authorised', () => {
    expect(
      evaluateRouteProjectAccess({
        routeProjectId: P1,
        selectedProjectId: null,
        accessibleProjectIds: [P1],
      }),
    ).toBe('no_selection');
  });

  it('rejects invalid ids', () => {
    expect(
      evaluateRouteProjectAccess({
        routeProjectId: 'not-an-id',
        selectedProjectId: P1,
        accessibleProjectIds: [P1],
      }),
    ).toBe('invalid_id');
  });
});
