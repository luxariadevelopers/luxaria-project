import { describe, expect, it } from 'vitest';
import { resolveCashAccountCapabilities } from './roleAccess';
import {
  CashAccountKind,
  CashAccountStatus,
  type PublicCashAccount,
} from './types';
import {
  canCloseWithBalance,
  resolveCashAccountRowActions,
} from './workflowActions';

const base: PublicCashAccount = {
  id: '507f1f77bcf86cd799439011',
  accountCode: 'CSH-0001',
  accountName: 'Site Petty Cash',
  kind: CashAccountKind.PettyCash,
  projectId: '507f1f77bcf86cd799439012',
  custodianUserId: '507f1f77bcf86cd7994390aa',
  ledgerAccountId: '507f1f77bcf86cd7994390bb',
  maximumHoldingLimit: 50000,
  replenishmentLevel: 10000,
  openingBalance: 0,
  status: CashAccountStatus.Active,
  pendingHandover: null,
  closedAt: null,
  closedBy: null,
  closeReason: null,
};

describe('resolveCashAccountCapabilities', () => {
  it('maps Nest cash.* permissions (not cash_account.*)', () => {
    const caps = resolveCashAccountCapabilities((code) =>
      ['cash.view', 'cash.manage'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canManage).toBe(true);
    expect(caps.canConfirmHandover).toBe(true);
  });

  it('denies manage without cash.manage', () => {
    const caps = resolveCashAccountCapabilities(
      (code) => code === 'cash.view',
    );
    expect(caps.canView).toBe(true);
    expect(caps.canManage).toBe(false);
  });
});

describe('resolveCashAccountRowActions — custodian changes', () => {
  const manageCaps = resolveCashAccountCapabilities((code) =>
    ['cash.view', 'cash.manage'].includes(code),
  );
  const viewCaps = resolveCashAccountCapabilities(
    (code) => code === 'cash.view',
  );

  it('allows transfer on active account for managers', () => {
    expect(
      resolveCashAccountRowActions(base, manageCaps, base.custodianUserId),
    ).toEqual(expect.arrayContaining(['transfer', 'close']));
  });

  it('hides transfer for view-only users', () => {
    expect(
      resolveCashAccountRowActions(base, viewCaps, base.custodianUserId),
    ).not.toContain('transfer');
  });

  it('offers confirm only to outgoing/incoming custodians during handover', () => {
    const pending: PublicCashAccount = {
      ...base,
      status: CashAccountStatus.PendingHandover,
      pendingHandover: {
        fromUserId: '507f1f77bcf86cd7994390aa',
        toUserId: '507f1f77bcf86cd7994390cc',
        initiatedBy: '507f1f77bcf86cd7994390dd',
        initiatedAt: '2026-07-20T00:00:00.000Z',
        outgoingConfirmedAt: null,
        outgoingConfirmedBy: null,
        incomingConfirmedAt: null,
        incomingConfirmedBy: null,
        declaredBalance: 1000,
        notes: null,
        awaitingOutgoingConfirmation: true,
        awaitingIncomingConfirmation: true,
      },
    };

    expect(
      resolveCashAccountRowActions(
        pending,
        viewCaps,
        '507f1f77bcf86cd7994390aa',
      ),
    ).toContain('confirm_handover');

    expect(
      resolveCashAccountRowActions(
        pending,
        viewCaps,
        '507f1f77bcf86cd7994390cc',
      ),
    ).toContain('confirm_handover');

    expect(
      resolveCashAccountRowActions(
        pending,
        viewCaps,
        '507f1f77bcf86cd7994390ee',
      ),
    ).not.toContain('confirm_handover');

    expect(
      resolveCashAccountRowActions(pending, manageCaps, null),
    ).toContain('cancel_handover');

    expect(
      resolveCashAccountRowActions(pending, manageCaps, null),
    ).not.toContain('transfer');
  });

  it('stops offering confirm after outgoing confirmation for outgoing user', () => {
    const pending: PublicCashAccount = {
      ...base,
      status: CashAccountStatus.PendingHandover,
      pendingHandover: {
        fromUserId: '507f1f77bcf86cd7994390aa',
        toUserId: '507f1f77bcf86cd7994390cc',
        initiatedBy: '507f1f77bcf86cd7994390dd',
        initiatedAt: '2026-07-20T00:00:00.000Z',
        outgoingConfirmedAt: '2026-07-20T01:00:00.000Z',
        outgoingConfirmedBy: '507f1f77bcf86cd7994390aa',
        incomingConfirmedAt: null,
        incomingConfirmedBy: null,
        declaredBalance: 1000,
        notes: null,
        awaitingOutgoingConfirmation: false,
        awaitingIncomingConfirmation: true,
      },
    };

    expect(
      resolveCashAccountRowActions(
        pending,
        viewCaps,
        '507f1f77bcf86cd7994390aa',
      ),
    ).not.toContain('confirm_handover');

    expect(
      resolveCashAccountRowActions(
        pending,
        viewCaps,
        '507f1f77bcf86cd7994390cc',
      ),
    ).toContain('confirm_handover');
  });

  it('blocks close while handover is pending', () => {
    const pending: PublicCashAccount = {
      ...base,
      status: CashAccountStatus.PendingHandover,
      pendingHandover: {
        fromUserId: '507f1f77bcf86cd7994390aa',
        toUserId: '507f1f77bcf86cd7994390cc',
        initiatedBy: '507f1f77bcf86cd7994390dd',
        initiatedAt: '2026-07-20T00:00:00.000Z',
        outgoingConfirmedAt: null,
        outgoingConfirmedBy: null,
        incomingConfirmedAt: null,
        incomingConfirmedBy: null,
        declaredBalance: null,
        notes: null,
        awaitingOutgoingConfirmation: true,
        awaitingIncomingConfirmation: true,
      },
    };
    expect(
      resolveCashAccountRowActions(pending, manageCaps, null),
    ).not.toContain('close');
  });
});

describe('canCloseWithBalance', () => {
  it('allows zero balance', () => {
    expect(canCloseWithBalance(0).ok).toBe(true);
    expect(canCloseWithBalance(0.001).ok).toBe(true);
  });

  it('rejects unresolved non-zero balance', () => {
    const result = canCloseWithBalance(250);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/non-zero balance/);
    }
  });
});
