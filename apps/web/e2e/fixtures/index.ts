import { test as base, type APIRequestContext } from '@playwright/test';
import { createApiClient, type E2eApiClient } from './api-client';
import { readRuntimeState } from './seed-data';
import { e2eEnv, isLiveApi, type E2eRuntimeState } from './test-env';

type E2eFixtures = {
  e2eState: E2eRuntimeState;
  adminApi: E2eApiClient;
};

export const test = base.extend<E2eFixtures>({
  e2eState: async (_fixtures, provide) => {
    if (!isLiveApi()) {
      await provide({ liveApi: false });
      return;
    }

    const state = (await readRuntimeState()) ?? { liveApi: true };
    await provide(state);
  },

  adminApi: async ({ request, e2eState }, provide) => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const api = await createApiClient(request);
    const session = await api.login(
      e2eEnv.admin.identifier,
      e2eEnv.admin.password,
    );
    await provide(api.withToken(session.accessToken));

    void e2eState;
  },
});

export { expect } from '@playwright/test';

export function requireLiveApi(state: E2eRuntimeState | undefined): void {
  test.skip(!isLiveApi() || !state?.liveApi, 'Requires seeded live API');
}

export async function createAuthenticatedApi(
  request: APIRequestContext,
  identifier: string,
  password: string,
): Promise<E2eApiClient> {
  const api = await createApiClient(request);
  const session = await api.login(identifier, password);
  return api.withToken(session.accessToken);
}
