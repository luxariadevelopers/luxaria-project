import { resolveNotificationDeepLink } from '../resolveDeepLink';

const PROJECT_A = '507f1f77bcf86cd799439011';
const PROJECT_B = '507f1f77bcf86cd799439012';
const PO_ID = '507f191e810c19729de860ea';

function ctx(overrides?: {
  permissions?: string[];
  projects?: string[];
}) {
  const permissions = new Set(
    overrides?.permissions ?? [
      'notification.view',
      'dpr.create',
      'grn.create',
      'purchase.order',
      'project.view',
    ],
  );
  return {
    hasPermission: (code: string) => permissions.has(code),
    accessibleProjectIds: new Set(overrides?.projects ?? [PROJECT_A, PROJECT_B]),
  };
}

describe('resolveNotificationDeepLink', () => {
  it('opens DPR for daily_progress_report when permitted', () => {
    const result = resolveNotificationDeepLink(
      {
        entityType: 'daily_progress_report',
        entityId: PO_ID,
        eventType: 'missing_dpr',
        projectId: PROJECT_A,
      },
      ctx(),
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.target).toEqual({ screen: 'DailyProgressReport' });
      expect(result.projectId).toBe(PROJECT_A);
    }
  });

  it('opens GoodsReceipt with purchaseOrderId for purchase_order', () => {
    const result = resolveNotificationDeepLink(
      {
        entityType: 'purchase_order',
        entityId: PO_ID,
        projectId: PROJECT_A,
      },
      ctx(),
    );
    expect(result).toEqual({
      status: 'ok',
      target: {
        screen: 'GoodsReceipt',
        params: { purchaseOrderId: PO_ID },
      },
      requiredPermissions: ['purchase.order', 'grn.create'],
      projectId: PROJECT_A,
    });
  });

  it('falls back to DPR for missing_dpr event without entityType', () => {
    const result = resolveNotificationDeepLink(
      { eventType: 'missing_dpr', projectId: PROJECT_A },
      ctx(),
    );
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.target.screen).toBe('DailyProgressReport');
    }
  });

  it('rejects unknown entity types as invalid', () => {
    const result = resolveNotificationDeepLink(
      { entityType: 'vendor_payment', entityId: PO_ID },
      ctx(),
    );
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.reason).toMatch(/unsupported entity type/i);
    }
  });

  it('rejects malformed entity ids', () => {
    const result = resolveNotificationDeepLink(
      { entityType: 'purchase_order', entityId: 'not-a-mongo-id' },
      ctx(),
    );
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.reason).toMatch(/not a valid record id/i);
    }
  });

  it('rejects purchase_order deep links missing entity id', () => {
    const result = resolveNotificationDeepLink(
      { entityType: 'purchase_order', entityId: null },
      ctx(),
    );
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') {
      expect(result.reason).toMatch(/missing a required entity id/i);
    }
  });

  it('denies when required permission is missing', () => {
    const result = resolveNotificationDeepLink(
      {
        entityType: 'goods_receipt',
        entityId: PO_ID,
        projectId: PROJECT_A,
      },
      ctx({ permissions: ['notification.view', 'project.view'] }),
    );
    expect(result.status).toBe('forbidden');
    if (result.status === 'forbidden') {
      expect(result.reason).toMatch(/grn\.create/);
    }
  });

  it('denies when notification project is not accessible', () => {
    const result = resolveNotificationDeepLink(
      {
        entityType: 'daily_progress_report',
        projectId: '507f1f77bcf86cd799439099',
      },
      ctx({ projects: [PROJECT_A] }),
    );
    expect(result.status).toBe('forbidden');
    if (result.status === 'forbidden') {
      expect(result.reason).toMatch(/do not have access/i);
    }
  });

  it('rejects invalid project id on the notification', () => {
    const result = resolveNotificationDeepLink(
      {
        entityType: 'daily_progress_report',
        projectId: 'bad-project',
      },
      ctx(),
    );
    expect(result.status).toBe('invalid');
  });

  it('returns none when there is no mappable deep link', () => {
    const result = resolveNotificationDeepLink(
      { eventType: 'director_daily_digest', entityType: null },
      ctx(),
    );
    expect(result.status).toBe('none');
  });

  it('opens Projects tab for project entity when accessible', () => {
    const result = resolveNotificationDeepLink(
      { entityType: 'project', entityId: PROJECT_B },
      ctx(),
    );
    expect(result).toEqual({
      status: 'ok',
      target: { screen: 'Tabs', params: { screen: 'Projects' } },
      requiredPermissions: ['project.view'],
      projectId: PROJECT_B,
    });
  });
});
