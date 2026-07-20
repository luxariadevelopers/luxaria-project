import { expect, requireLiveApi, test } from './fixtures';

test.describe('Approvals API smoke', () => {
  test('admin can list approval requests for the seeded project', async ({
    adminApi,
    e2eState,
  }) => {
    requireLiveApi(e2eState);
    test.skip(!e2eState.projectId, 'Seeded project missing from runtime state');

    const listRes = await adminApi.get(
      `/projects/${e2eState.projectId}/approvals?page=1&limit=10`,
    );
    expect(listRes.ok()).toBeTruthy();

    const listBody = (await listRes.json()) as {
      success: boolean;
      data: unknown[];
    };
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);
  });

  test('admin can create a draft approval request', async ({
    adminApi,
    e2eState,
  }) => {
    requireLiveApi(e2eState);
    test.skip(!e2eState.projectId, 'Seeded project missing from runtime state');

    const createRes = await adminApi.post(
      `/projects/${e2eState.projectId}/approvals`,
      {
        module: 'e2e',
        entityType: 'smoke_test',
        entityId: '507f1f77bcf86cd799439011',
        amount: 1000,
        reason: 'Playwright approval smoke',
      },
    );

    expect(createRes.ok()).toBeTruthy();
    const createBody = (await createRes.json()) as {
      success: boolean;
      data?: { id?: string; status?: string };
    };
    expect(createBody.success).toBe(true);
    expect(createBody.data?.id).toBeTruthy();
    expect(createBody.data?.status).toBe('draft');
  });
});
