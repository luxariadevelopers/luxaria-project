import { describe, expect, it } from 'vitest';
import {
  assertActionAllowed,
  isActionAllowedForStatus,
  resolveVisibleActions,
} from './resolveActions';
import type { EntityDetailAction } from './types';

function action(
  partial: Pick<
    EntityDetailAction,
    'id' | 'permission' | 'allowedStatuses'
  > &
    Partial<EntityDetailAction>,
): EntityDetailAction {
  return {
    label: partial.id,
    onClick: () => undefined,
    ...partial,
  };
}

describe('resolveVisibleActions', () => {
  const actions: EntityDetailAction[] = [
    action({
      id: 'edit',
      permission: 'purchase.order',
      allowedStatuses: ['draft', 'rejected'],
    }),
    action({
      id: 'submit',
      permission: 'purchase.order',
      allowedStatuses: ['draft'],
    }),
    action({
      id: 'approve',
      permission: 'purchase.approve',
      allowedStatuses: ['pending_approval'],
    }),
  ];

  it('requires both permission and explicit status', () => {
    const visible = resolveVisibleActions(actions, {
      status: 'draft',
      hasPermission: (p) => p === 'purchase.order',
    });
    expect(visible.map((a) => a.id)).toEqual(['edit', 'submit']);
  });

  it('hides actions when status is not listed', () => {
    const visible = resolveVisibleActions(actions, {
      status: 'issued',
      hasPermission: () => true,
    });
    expect(visible).toHaveLength(0);
  });

  it('hides actions when permission is missing', () => {
    const visible = resolveVisibleActions(actions, {
      status: 'pending_approval',
      hasPermission: (p) => p === 'purchase.order',
    });
    expect(visible).toHaveLength(0);
  });

  it('treats empty allowedStatuses as never visible', () => {
    const never = action({
      id: 'ghost',
      permission: 'purchase.view',
      allowedStatuses: [],
    });
    expect(isActionAllowedForStatus(never, 'draft')).toBe(false);
    expect(
      resolveVisibleActions([never], {
        status: 'draft',
        hasPermission: () => true,
      }),
    ).toHaveLength(0);
  });
});

describe('assertActionAllowed', () => {
  it('blocks click when status no longer matches', () => {
    const edit = action({
      id: 'edit',
      permission: 'purchase.order',
      allowedStatuses: ['draft'],
    });
    expect(
      assertActionAllowed(edit, {
        status: 'pending_approval',
        hasPermission: () => true,
      }),
    ).toBe(false);
    expect(
      assertActionAllowed(edit, {
        status: 'draft',
        hasPermission: () => true,
      }),
    ).toBe(true);
  });
});
