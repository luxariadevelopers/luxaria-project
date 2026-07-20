import { describe, expect, it } from 'vitest';
import { resolveParticipantCapabilities } from './roleAccess';

describe('resolveParticipantCapabilities', () => {
  it('maps Nest catalog codes (no project_participant.manage)', () => {
    const caps = resolveParticipantCapabilities((code) =>
      [
        'project_participant.view',
        'project_participant.create',
        'project_participant.update',
      ].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canUpdate).toBe(true);
    expect(caps.canManage).toBe(true);
  });

  it('treats manage as create or update', () => {
    expect(
      resolveParticipantCapabilities((c) => c === 'project_participant.create')
        .canManage,
    ).toBe(true);
    expect(
      resolveParticipantCapabilities((c) => c === 'project_participant.update')
        .canManage,
    ).toBe(true);
    expect(
      resolveParticipantCapabilities((c) => c === 'project_participant.view')
        .canManage,
    ).toBe(false);
  });
});
