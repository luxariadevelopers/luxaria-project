import { describe, expect, it } from 'vitest';
import { PROJECT_STATUS_TRANSITIONS } from './constants';
import { ProjectStatus } from './types';

describe('PROJECT_STATUS_TRANSITIONS', () => {
  it('matches backend Draft and Active transitions', () => {
    expect(PROJECT_STATUS_TRANSITIONS[ProjectStatus.Draft]).toEqual([
      ProjectStatus.Planning,
      ProjectStatus.Cancelled,
    ]);
    expect(PROJECT_STATUS_TRANSITIONS[ProjectStatus.Active]).toEqual([
      ProjectStatus.OnHold,
      ProjectStatus.Completed,
      ProjectStatus.Cancelled,
      ProjectStatus.Construction,
    ]);
  });

  it('allows Closed ↔ Archived and keeps Cancelled terminal', () => {
    expect(PROJECT_STATUS_TRANSITIONS[ProjectStatus.Closed]).toEqual([
      ProjectStatus.Archived,
    ]);
    expect(PROJECT_STATUS_TRANSITIONS[ProjectStatus.Archived]).toEqual([
      ProjectStatus.Closed,
    ]);
    expect(PROJECT_STATUS_TRANSITIONS[ProjectStatus.Cancelled]).toEqual([]);
  });

  it('covers every ProjectStatus key', () => {
    for (const status of Object.values(ProjectStatus)) {
      expect(PROJECT_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });
});
