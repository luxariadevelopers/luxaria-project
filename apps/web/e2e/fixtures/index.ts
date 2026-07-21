import { test as base } from '@playwright/test';
import {
  createApiClient,
  createAuthenticatedApi,
  E2eApiClient,
  toGoldenPathContext,
  uniqueRunSuffix,
} from './api-client';
import { readRuntimeState } from './seed-data';
import {
  e2eEnv,
  hasGoldenPathActors,
  isLiveApi,
  type E2eRuntimeState,
} from './test-env';

type E2eFixtures = {
  e2eState: E2eRuntimeState;
  adminApi: E2eApiClient;
};

export const test = base.extend<E2eFixtures>({
  e2eState: async ({}, use) => {
    if (!isLiveApi()) {
      await use({ liveApi: false });
      return;
    }

    const state = (await readRuntimeState()) ?? { liveApi: true };
    await use(state);
  },

  adminApi: async ({ request, e2eState }, use) => {
    test.skip(!isLiveApi(), 'Requires live API (E2E_LIVE_API or CI)');

    const api = await createApiClient(request);
    const session = await api.login(
      e2eEnv.admin.identifier,
      e2eEnv.admin.password,
    );
    await use(api.withToken(session.accessToken));

    void e2eState;
  },
});

export { expect } from '@playwright/test';

export {
  createAuthenticatedApi,
  hasGoldenPathActors,
  toGoldenPathContext,
  uniqueRunSuffix,
};

export function requireLiveApi(state: E2eRuntimeState | undefined): void {
  test.skip(!isLiveApi() || !state?.liveApi, 'Requires seeded live API');
}

export function requireGoldenPathSeed(state: E2eRuntimeState | undefined): void {
  test.skip(state?.seedFailed, state?.seedError ?? 'E2E seed failed');
  test.skip(
    !hasGoldenPathActors(state),
    'Golden-path actors or master data missing from runtime state',
  );
}
